
const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 9091;

// const apiKey = process.env.REACT_APP_AIRTABLE_API_KEY;

app.use(cors());
app.use(express.json());

app.get('/', (_, res) => {
    res.send(
        'Page does not contain content. Try another endpoint'
    );
})

app.post('/bills', (req, res) => {
    console.log("Bill request received");
    console.log(req.body);

    res.send({
        status: "POST received"
    })
})


app.listen(port, () => console.log(`Meeee ${port}`));