const fetch = require("node-fetch");
const { getAllCustomers } = require("../airtable/request");

require("dotenv").config();

const SERVER_URL = process.env.SERVER_URL;

// This script updates each Customer's "Starting Meter Reading" and "Starting Meter Last Changed" in Airtable.
// Those column values are used to calculate the period usage for each customer when meter readings are logged.
// This script is to be run once a month (can be set up as a cron job via something like Heroku Scheduler).
const updateCustomerStartingMeters = async () => {
  try {
    const meteredCustomers = await getAllCustomers("{Meter Type} != 'No Meter'");
    meteredCustomers.forEach(async (customer) => {
      // We await here to minimize the chance this script encounters Airtable rate limits
      await updateCustomerStartingMeter(customer.id);
    });
  } catch (err) {
    console.log("(updateCustomerStartingMeter) Error:", err);
  }
};

const updateCustomerStartingMeter = async (customerId) => {
  const url = `${SERVER_URL}/starting-meter-reading/update`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customerId }),
    });
    console.log(
      `Invoice created for customer: ${customerId}, response: ${response}`
    );
  } catch (err) {
    console.log("(updateCustomerStartingMeter) Error: ", err);
  }
};

updateCustomerStartingMeters();
