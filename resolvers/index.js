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
} = require("../airtable/request");
const { matchCustomers } = require("../airtable/utils");

module.exports = {
  Sites: async (siteRecord, authRecord) => {
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

    matchCustomers(customers, meterReadings, payments);
    siteRecord.fields.CustomerData = customers;
    siteRecord.fields.FinancialSummaries = financialSummaries;
    siteRecord.fields.TariffPlans = tariffPlans;

    // Inventory fields
    siteRecord.fields.Products = products;
    siteRecord.fields.SiteInventory = inventory;
    siteRecord.fields.PurchaseRequests = purchaseRequests;
    siteRecord.fields.InventoryUpdates = inventoryUpdates;
    return siteRecord;
  },
  PurchaseRequests: async (purchaseRequestRecord, authRecord) => {
    console.log("hello");
  },
  // PurchaseRequests: {
  //   write: async (purchaseRequestRecord, authRecord) => {
  //     console.log( "access resolver purchaserequests!", purchaseRequestRecord);
  //     const dataURI = purchaseRequestRecord.receipt[0].url;

  //     const year = new Date().getFullYear();
  //     const month = new Date().getMonth();
  //     const randomNumber = Math.random();
  //     const blobName = `${year}-${month}-${randomNumber}`;
  //     const photoUrl = await uploadBlob(blobName, dataURI);
  //     console.log("heres the photo url", photoUrl);
  //     purchaseRequestRecord.receipt = photoUrl;
  //   },
  // },
};
