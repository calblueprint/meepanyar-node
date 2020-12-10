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


app.get('/', (_, res) => {
    res.status(200);
    res.json({ status: 'OK' })
})

app.post('/customer/create', async (req, res) => {
    const customerData = req.body;
    console.log("Customer Creation Payload: ", customerData);

    try {
        const { name, meterNumber, tariffPlansId, sitesId, meterReadings, payments } = customerData;
        const hasMeter = meterNumber ? true : false;
        const isActive = true;

        const airtableCustomerData = {
            isactive: isActive,
            hasmeter: hasMeter,
            tariffPlansId,
            sitesId,
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

        res.status(201);
        res.json({ status: 'OK' })
    } catch (err) {
        console.log(err);
        res.status(400);
        res.json({ error: err });
    }
})

// Endpoint used to create meter readings when the meter reading
// contains a customer id (the customer already exists in airtable).
app.post('/meter-readings-and-invoices/create', async (req, res) => {
    const meterReadingData = req.body;
    console.log("Meter reading data: ", meterReadingData);
    const resultData = await createMeterReadingsandInvoice(meterReadingData);
    res.status(201);
    res.json({ status: 'OK', id: resultData });
})

app.listen(port, () => console.log(`Mee Panyar port ${port}!`));
