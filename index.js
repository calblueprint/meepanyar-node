
import Airlock from 'airlock-server';
import { getAllUsers } from './airtable/request'
import { base } from './airtable/airtable';

const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 4001;
const apiKey = process.env.AIRTABLE_API_KEY

app.use(cors());
app.use(express.json());

console.log("API KEY GIVEN TO AIRLOCK: ", apiKey);
console.log("BASE ID: ", process.env.AIRTABLE_BASE_ID);

new Airlock({
    server: app,
    airtableApiKey: [apiKey],
    airtableBaseId: process.env.AIRTABLE_BASE_ID,
    airtableUserTableName: 'Users',
    airtableUsernameColumn: 'Username',
    airtablePasswordColumn: 'Password'
    // allowedOrigins: ["http://localhost:3000"]
});

app.get('/', (_, res) => {
    res.send(
        'Page does not contain content. Try another endpoint'
    );
})

app.get('/getUsers', (req, res) => {
    console.log("Users received getting users");
    const allUsers = getAllUsers();
    console.log(JSON.stringify(allUsers));

    res.send({
        status: "GET received"
    });
})

app.post('/registerUser', (req, res) => {
    console.log("registering user");
    console.log(req.body)
    const {username, password, fields} = req.body;

    base.register({
        username: username,
        password: password,
        fields: fields
    }).then(console.log)

    res.send({
        status: "POST received"
    })
})

app.listen(port, () => console.log(`Meeee ${port}`));