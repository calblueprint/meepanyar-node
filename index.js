
import Airlock from 'airlock-server';

const airlockPort = process.env.PORT || 4000;
const apiKey = process.env.AIRTABLE_API_KEY

new Airlock({
    port: airlockPort,
    airtableApiKey: [apiKey],
    airtableBaseId: process.env.AIRTABLE_BASE_ID,
    airtableUserTableName: 'Users',
    airtableUsernameColumn: 'Username',
    airtablePasswordColumn: 'Password',
    allowedOrigins: ["http://localhost:3000"] // TODO: Change to be fetched from file
});
