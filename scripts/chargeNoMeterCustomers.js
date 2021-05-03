const fetch = require("node-fetch");
const { getAllCustomers } = require("../airtable/request");

require("dotenv").config();

const SERVER_URL = process.env.SERVER_URL;

// This script creates a MeterReadingAndInvoice record for customers that have "No Meter" 
// by charging the Fixed Tariff Value from their tariff plan.
// This script is to be run once a month (can be set up as a cron job via something like Heroku Scheduler).
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
