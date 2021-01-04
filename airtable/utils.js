
// Function receives a list of customers, meterReadings, and payments,
// and adds the appropriate meter readings and payments to each customer object
export const matchCustomersWithReadingsAndPayments = (customers, meterReadings, payments) => {
    customers.forEach(customer => {
        const customerId = customer.id;
        customer.meterReadings = [];
        customer.payments = [];

        const customerMeterReadings =
            meterReadings.filter(meterReading => meterReading.customerId === customerId);

        const customerPayments =
            payments.filter(payment => payment.customerId === customerId);

        customer.meterReadings = customerMeterReadings;
        customer.payments = customerPayments;
    })
}