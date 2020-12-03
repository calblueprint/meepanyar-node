import express from 'express';
import cors from 'cors';
import Airlock from 'airlock-server';
import { calculateTotalCustomers } from './utils/calculations';

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
    allowedOrigins: ["http://localhost:3000"] // TODO: Change to be fetched from file
});

app.use(cors());
app.use(express.json());


app.get('/', (_, res) => {
    res.status(200);
    res.json({ status: 'OK' })
});

app.get('/financialsummarycalc', (_, res) => {
    console.log('Received request to calculate financial summary information');
    try {
        const totalCustomers = calculateTotalCustomers();
        res.json({ customerNumber:  totalCustomers });
    } catch (e) {
        console.log(e);
    }
});

app.listen(port, () => console.log(`Mee Panyar port ${port}!`));
