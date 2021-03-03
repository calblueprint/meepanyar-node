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

    // We resolve each site's customerId to their appropriate customer
    const customerIds = siteRecord.fields.Customers;
    if (customerIds) {
      const customers = await getCustomersByIds(customerIds);
      const meterReadingIds = [];
      const paymentIds = [];
      const tariffPlanIds = [];

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

      let [meterReadings, payments] = await Promise.all([
        getMeterReadingsandInvoicesByIds(meterReadingIds),
        getPaymentsByIds(paymentIds),
      ]);

      matchCustomers(customers, meterReadings, payments);

      siteRecord.fields.Customers = customers;
    }

    const financialSummaryIds = siteRecord.fields["Fainancial Summaries"];
    let financialSummaries = [];
    if (financialSummaryIds) {
      financialSummaries = await getFinancialSummariesByIds(
        financialSummaryIds
      );
    }
    siteRecord.fields.FinancialSummaries = financialSummaries;

    const tariffPlanIds = siteRecord.fields["Tariff Plans"];
    let tariffPlans = [];
    if (tariffPlanIds) {
      tariffPlans = await getTariffPlansByIds(tariffPlanIds);
    }
    siteRecord.fields.TariffPlans = tariffPlans;

    return siteRecord;
  },
};
