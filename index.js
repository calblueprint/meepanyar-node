import express from 'express';
import cors from 'cors';
import Airlock from 'airlock-server';
import { createCustomer, createManyMeterReadingsandInvoices, createManyPayments, createMeterReadingsandInvoice, createPayment } from './airtable/request';

const airlockPort = process.env.PORT || 4000;
const apiKey = process.env.AIRTABLE_API_KEY;

const app = express();
const port = process.env.PORT || 4000;

new Airlock({
    // port: airlockPort,
    server: app,
    airtableApiKey: [apiKey],
    airtableBaseId: process.env.AIRTABLE_BASE_ID,
    airtableUserTableName: 'Users',
    airtableUsernameColumn: 'Username',
    airtablePasswordColumn: 'Password',
    allowedOrigins: ["http://localhost:3000", "http://localhost:5000"] // TODO: Change to be fetched from file
});

app.use(cors());
app.use(express.json());


app.get('/', (_, result) => {
    result.status(200);
    result.json({ status: 'OK' })
})

// This endpoint is used to create customers from the frontend.
// To support offline functionality while keeping our API stateless,
// we add meterReadings and payments for offline customers into the
// customerData payload, and create meterReadings and payments for
// the customer created after the customer has been created in airtable.
app.post('/customers/create', async (request, result) => {
    const customerData = request.body;
    console.log("Customer Creation Payload: ", customerData);

    try {
        const { name, meterNumber, tariffPlanId, siteId, meterReadings, payments } = customerData;
        const hasMeter = meterNumber ? true : false;
        const isActive = true;

        const airtableCustomerData = {
            isactive: isActive,
            hasmeter: hasMeter,
            tariffPlanId,
            siteId,
            name,
            meterNumber
        };

        const customerId = await createCustomer(airtableCustomerData);
        console.log("Customer id: ", customerId);
        console.log("Customer created!");

        if (meterReadings) {
            try {
                meterReadings.forEach(meterReading => meterReading.customerId = customerId);
                createManyMeterReadingsandInvoices(meterReadings);
                console.log("Created meter readings")
            } catch (err) {
                console.log("Meter reading error: ", err);
            }
        }

        if (payments) {
            try {
                payments.forEach(payment => payment.customerId = customerId);
                createManyPayments(payments)
                console.log("Created payments")
            } catch (err) {
                console.log("Payments error: ", err);
            }
        }

        result.status(201);
        result.json({ status: 'OK' })
    } catch (err) {
        console.log(err);
        result.status(400);
        result.json({ error: err });
    }
})

// Endpoint used to create meter readings when the meter reading
// contains a customer id (the customer already exists in airtable).
app.post('/meter-readings-and-invoices/create', async (request, result) => {
    try {
        const meterReadingData = request.body;
        console.log("Meter reading data: ", meterReadingData);
        const resultData = await createMeterReadingsandInvoice(meterReadingData);
        result.status(201);
        result.json({ status: 'OK', id: resultData });
    } catch (err) {
        console.log('Error when creating meter reading and invoice: ', err);
        result.status(400);
        result.json({ error: err });
    }
})

// Endpoint used to create payments when the payment
// contains a customer id (the customer already exists in airtable).
app.post('/payments/create', async (request, result) => {
    try {
        const paymentData = request.body;
        console.log("Payment data: ", paymentData);
        const resultData = await createPayment(paymentData);
        result.status(201);
        result.json({ status: 'OK', id: resultData });
    } catch (err) {
        console.log('Error when creating payment: ', err);
        result.status(400);
        result.json({ error: err });
    }
})

app.listen(port, () => console.log(`Mee Panyar port ${port}!`));
