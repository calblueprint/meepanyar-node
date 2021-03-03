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
        const customerTariffPlansIds = customer.tariffPlansId;

        if (customerMeterReadingIds) {
          meterReadingIds.push(...customerMeterReadingIds);
        }

        if (customerPaymentIds) {
          paymentIds.push(...customerPaymentIds);
        }

        if (customerTariffPlansIds) {
          tariffPlanIds.push(customerTariffPlansIds);
        }
      });

      let [meterReadings, payments, tariffPlans] = await Promise.all([
        getMeterReadingsandInvoicesByIds(meterReadingIds),
        getPaymentsByIds(paymentIds),
        getTariffPlansByIds(tariffPlanIds),
      ]);

      matchCustomers(customers, meterReadings, payments, tariffPlans);

      siteRecord.fields.Customers = customers;
    }

    const financialSummaryIds = siteRecord.fields["Financial Summaries"];
    let financialSummaries = [];
    if (financialSummaryIds) {
      financialSummaries = await getFinancialSummariesByIds(
        financialSummaryIds
      );
    }
    siteRecord.fields.FinancialSummaries = financialSummaries;
    return siteRecord;
  },
};
