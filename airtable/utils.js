// Function receives a list of customers, meterReadings, and payments,
// and adds the appropriate meter readings, payments, and tariff info to each customer object
export const matchCustomers = (
  customers,
  meterReadings,
  payments,
  tariffPlans
) => {
  customers.forEach((customer) => {
    const customerId = customer.id;
    customer.meterReadings = [];
    customer.payments = [];

    const customerMeterReadings = meterReadings.filter(
      (meterReading) => meterReading.customerId === customerId
    );

    const customerPayments = payments.filter(
      (payment) => payment.customerId === customerId
    );

    const customerTariff = tariffPlans.filter((tariff) =>
      tariff.customerIds.includes(customerId)
    );

    [customer.tariffPlans] = customerTariff;
    customer.meterReadings = customerMeterReadings;
    customer.payments = customerPayments;
  });
};
