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
} = require("../airtable/request");
import { Tables } from "../airtable/schema";
import { generateFileName, uploadBlob } from "../lib/photoUtils";

module.exports = {
  [Tables.Sites]: async (siteRecord, authRecord) => {
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
        .map(({ id, admin, username }) =>
          siteUsers.push({ id, admin: admin || false, username })
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
};
