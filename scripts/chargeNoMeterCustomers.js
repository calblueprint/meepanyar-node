const fetch = require("node-fetch");
const { getAllCustomers } = require("../airtable/request");

require("dotenv").config();

const SERVER_URL = process.env.SERVER_URL;

// This script is to be run once a month by Heroku Scheduler
// It creates a MeterReadingAndInvoice record for the customer and charges the Fixed Tariff value
// from their tariff plan.
// Modify the frequency of how often this script is run via the Heroku Scheduler Portal.
const chargeNoMeter = async () => {
  try {
    const noMeterCustomers = await getAllCustomers("{Meter Type} = 'No Meter'");
    noMeterCustomers.forEach(async (customer) => {
      await chargeNoMeterCustomers(customer.id);
    });
  } catch (err) {
    console.log("(chargeNoMeter) Error:", err);
  }
};

const chargeNoMeterCustomers = async (customerId) => {
  const url = `${SERVER_URL}/meter-readings-invoice/create`;
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
    console.log("(chargeNoMeterCustomers) Error: ", err);
  }
};

chargeNoMeter();
