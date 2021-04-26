const fetch = require("node-fetch");
const { getAllCustomers } = require("../airtable/request");

require("dotenv").config();

const SERVER_URL = process.env.SERVER_URL;

// This script is to be run once a month by Heroku Scheduler
// It updates each Customer's "Starting Meter Reading" and "Starting Meter Last Changed" in Airtable
// Modify the frequency of how often this script is run via the Heroku Scheduler Portal.
const updateCustomerStartingMeters = async () => {
  try {
    const meteredCustomers = await getAllCustomers("{Meter Type} != 'No Meter'");
    meteredCustomers.forEach(async (customer) => {
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

// Corresponds to the customer named "Offline Customer"
const testUpdateCustomerStartingMeter = () => updateCustomerStartingMeter('recEa415yyWRft0xE');

// Corresponds to the customer named "Created Customer"
const testUpdateCustomerWithoutMeterReading = () => updateCustomerStartingMeter('rec20H5LwmMok670M');

// updateCustomerStartingMeters();
testUpdateCustomerStartingMeter();
testUpdateCustomerWithoutMeterReading();