const {
  getCustomersByIds,
  getMeterReadingsandInvoicesByIds,
  getPaymentsByIds,
  getFinancialSummariesByIds,
  getTariffPlansByIds,
  getAllProducts,
  getInventorysByIds,
  getPurchaseRequestsByIds,
  getInventoryUpdatesByIds,
  getAllUsers,
  getSiteById,
  getCustomerById,
  deleteMeterReadingsandInvoice
} = require("../airtable/request");
import { Tables } from "../airtable/schema";
import { generateFileName, uploadBlob } from "../lib/photoUtils";
import { getLatestMeterReadingForCustomer } from '../lib/meterReadingUtils';
import moment from 'moment';

module.exports = {
  [Tables.Sites]: {
    read: async (siteRecord, authRecord) => {
    if (
      !siteRecord.fields.Users ||
      !siteRecord.fields.Users.includes(authRecord.id)
    ) {
      return false;
    }

    const promises = [];
    // We resolve each site's customerId to their appropriate customer
    const customerIds = siteRecord.fields.Customers;
    let customers = [];
    let meterReadings = [];
    let payments = [];
    if (customerIds) {
      customers = await getCustomersByIds(customerIds);
      const meterReadingIds = [];
      const paymentIds = [];

      // We get all the meter reading and payment ids for all customers
      // to minimize Airtable API calls, and then match the meter readings
      // and payments received to their appropriate customer afterwards
      customers.forEach((customer) => {
        const customerMeterReadingIds = customer.meterReadingIds;
        const customerPaymentIds = customer.paymentIds;

        if (customerMeterReadingIds) {
          meterReadingIds.push(...customerMeterReadingIds);
        }

        if (customerPaymentIds) {
          paymentIds.push(...customerPaymentIds);
        }
      });

      const meterReadingsPromise = getMeterReadingsandInvoicesByIds(
        meterReadingIds
      ).then((res) => (meterReadings = res));
      promises.push(meterReadingsPromise);

      const paymentsPromise = getPaymentsByIds(paymentIds).then(
        (res) => (payments = res)
      );
      promises.push(paymentsPromise);
    }

    const financialSummaryIds = siteRecord.fields["Financial Summaries"];
    let financialSummaries = [];
    if (financialSummaryIds) {
      const financialSummariesPromise = getFinancialSummariesByIds(
        financialSummaryIds
      ).then((res) => (financialSummaries = res));
      promises.push(financialSummariesPromise);
    }

    const tariffPlanIds = siteRecord.fields["Tariff Plans"];
    let tariffPlans = [];
    if (tariffPlanIds) {
      const tariffPlansPromise = getTariffPlansByIds(tariffPlanIds).then(
        (res) => (tariffPlans = res)
      );
      promises.push(tariffPlansPromise);
    }

    let products = [];
    const productsPromise = getAllProducts().then((res) => (products = res));
    promises.push(productsPromise);

    const inventoryIds = siteRecord.fields.Inventory;
    let inventory = [];
    if (inventoryIds) {
      const inventoryPromise = getInventorysByIds(inventoryIds).then(
        (res) => (inventory = res)
      );
      promises.push(inventoryPromise);
    }

    const siteUsers = [];
    const siteUsersPromise = getAllUsers().then((result) =>
      result
        .filter((user) => user.siteIds?.includes(siteRecord.id))
        .map(({ id, admin, username, name, siteIds, inactive }) =>
          siteUsers.push({
            id,
            admin: admin || false,
            inactive: inactive || false,
            username,
            name,
            siteIds,
          })
        )
    );
    promises.push(siteUsersPromise);

    // Await all promises at once
    await Promise.all(promises);
    promises.length = 0; // clear promises

    // Load purchase requests and inventory updates based on loaded inventory

    // NOTE: this could be done with fewer requests (by pooling all the purchaseRequestIds for
    // all items and making a single getPurchaseRequestsByIds call) but this shouldn't be a bottleneck
    const inventoryWithPurchaseRequests = inventory.filter(
      (inv) => inv.purchaseRequestIds
    );
    let purchaseRequests = [];
    let purchaseRequestPromise = Promise.all(
      inventoryWithPurchaseRequests.map(async (item) =>
        getPurchaseRequestsByIds(item.purchaseRequestIds)
      )
    ).then((data) => (purchaseRequests = data));
    promises.push(purchaseRequestPromise);

    // NOTE: this could also be done with fewer requests but shouldn't be a bottleneck
    const inventoryWithUpdates = inventory.filter(
      (inv) => inv.inventoryUpdateIds
    );
    let inventoryUpdates = [];
    let inventoryUpdatesPromise = Promise.all(
      inventoryWithUpdates.map(async (item) =>
        getInventoryUpdatesByIds(item.inventoryUpdateIds)
      )
    ).then((data) => (inventoryUpdates = data));
    promises.push(inventoryUpdatesPromise);

    // Await inventory updates and purchase requests
    await Promise.all(promises);
    purchaseRequests = purchaseRequests.flat();
    inventoryUpdates = inventoryUpdates.flat();

    // The names of the below fields should match the objects
    // with type "custom-object" found in `meepanyar/src/lib/airtable/schema.js`.
    // It is important they have identical names or they will not transfer correctly.

    // Customer Fields
    siteRecord.fields.CustomerData = customers;
    siteRecord.fields.FinancialSummaries = financialSummaries;
    siteRecord.fields.TariffPlans = tariffPlans;
    siteRecord.fields.Payments = payments;
    siteRecord.fields.MeterReadings = meterReadings;

    // Inventory fields
    siteRecord.fields.Products = products;
    siteRecord.fields.SiteInventory = inventory;
    siteRecord.fields.PurchaseRequests = purchaseRequests;
    siteRecord.fields.InventoryUpdates = inventoryUpdates;

    // Site Users
    siteRecord.fields.SiteUsers = siteUsers;

    return siteRecord;
  },
  write: async (siteRecord, authRecord) => {
    return (authRecord.fields.Sites.includes(siteRecord.id) && authRecord.fields.Admin) || false
  }
},
  [Tables.PurchaseRequests]: {
    write: async (purchaseRequestRecord, authRecord) => {
      // Only allow admin users to review purchase requests
      // NOTE: "Pending" must exactly match the select label in Airtable + the enum on the frontend.
      if (
        purchaseRequestRecord.fields.hasOwnProperty("Status") &&
        purchaseRequestRecord.fields.Status !== "Pending"
      ) {
        if (
          authRecord.fields.Admin &&
          purchaseRequestRecord.fields.hasOwnProperty("Reviewer") &&
          purchaseRequestRecord.fields.Reviewer[0] === authRecord.id
        ) {
          return purchaseRequestRecord;
        } else {
          console.log(
            "[Purchase Requests] Review access denied: reviewer may not have admin permissions."
          );
          return false;
        }
      }
      if (purchaseRequestRecord.fields.hasOwnProperty("Receipt")) {
        const dataURI = purchaseRequestRecord.fields.Receipt[0].url;
        try {
          const photoUrl = await uploadBlob(generateFileName(), dataURI);
          purchaseRequestRecord.fields.Receipt = [{ url: photoUrl }];
        } catch (error) {
          console.log("[Purchase Requests] Error uploading image: ", error);
        }
      }
      return purchaseRequestRecord;
    },
  },
  [Tables.Users]: {
    // Admin approval required to modify non-self Users
    write: async (userRecord, authRecord) => {
      const sameAccount = userRecord.id === authRecord.id;

      // If user changed their own admin status, disallow
      const incomingRecordAdminStatus = userRecord.fields.hasOwnProperty("Admin") ? userRecord.fields.Admin : authRecord.fields.Admin;
      const adminStatusChanged = incomingRecordAdminStatus !== authRecord.fields.Admin;

      const isAdmin = authRecord.fields.Admin || false;

      if (sameAccount) {
        // If changing the same account, allow if they didn't change their own admin status
        return !adminStatusChanged
      } else {
        return isAdmin
      }
    }
  },
  [Tables.TariffPlans]:  {
    // Admin approval required to modify tariff plans
    write: async (tariffPlanRecord, authRecord) => {
      return authRecord.fields.Admin || false;
    }
  },
  [Tables.MeterReadingsandInvoices]: {
    write: async (meterReadingRecord, authRecord) => {
      try {
        const customerId = meterReadingRecord.fields.Customer[0];
        const customer = await getCustomerById(customerId);
        const [latestMeterReading, site] = await Promise.all([getLatestMeterReadingForCustomer(customer), getSiteById(customer.siteId)]);

        if (!latestMeterReading) {
          console.log("Could not find a past meter reading, allowing meter reading by default")
          return true
        }

        // We treat meter readings taken after the grace period deadline of the current month to be
        // meter readings for the current month. This is to prevent conflicts with meter readings
        // done on the 1st of the month that were meant to account for the previous month.
        const periodStart = moment().startOf('month').add(site.gracePeriod, 'days');
        const isCustomerMeteredForPeriod = moment(latestMeterReading.date).isSameOrAfter(periodStart);

        // If Customer was metered for the period, we delete the older 
        // meter reading to enforce 1 meter reading per period rule
        if (isCustomerMeteredForPeriod) {
          console.log('Existing meter reading already made for period. Deleting old one.')
          deleteMeterReadingsandInvoice(latestMeterReading.id);
        }

      } catch (error) {
        console.log('Error Checking Meter Reading, Allowing meter reading by default: ', error);
      }

      return true;
    }
  }
};
