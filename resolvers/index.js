const {
  getCustomersByIds,
  getMeterReadingsandInvoicesByIds,
  getPaymentsByIds,
  getFinancialSummariesByIds,
  getTariffPlansByIds,
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

    // Await all promises at once
    await Promise.all(promises);

    matchCustomers(customers, meterReadings, payments);
    siteRecord.fields.Customers = customers;
    siteRecord.fields.FinancialSummaries = financialSummaries;
    siteRecord.fields.TariffPlans = tariffPlans;

    return siteRecord;
  },
};
