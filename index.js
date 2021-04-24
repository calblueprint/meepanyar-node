import Airlock from 'airlock-server';
import express from 'express';
import moment from 'moment';
import {
  createCustomer,
  createFinancialSummarie,
  createInventory,
  createManyMeterReadingsandInvoices,
  createManyPayments,
  createMeterReadingsandInvoice,
  getAllInventorys,
  getAllMeterReadingsandInvoices,
  getAllPayments,
  getCustomerById,
  getCustomersByIds,
  getFinancialSummariesByIds,
  getPurchaseRequestsByIds,
  getSiteById,
  getTariffPlanById,
  updateFinancialSummarie
} from "./airtable/request";

import {
  calculateTotalActiveCustomers,
  calculateNumCustomersBilled,
  calculateNumCustomersPaid,
  calculateTotalAmountBilled,
  calculateTotalUsage,
  calculateTotalAmountCollected,
  calculateTotalAmountSpent
} from './lib/financialSummaryUtils';

const airlockPort = process.env.PORT || 4000;
const apiKey = process.env.AIRTABLE_API_KEY;
const PRODUCTION_WEB_URL = process.env.PRODUCTION_WEB_URL;
const DEVELOPMENT_WEB_URLS = ['http://localhost:3000', 'http://localhost:5000']

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
    allowedOrigins: [
        PRODUCTION_WEB_URL,
        ...DEVELOPMENT_WEB_URLS
    ]
});

// Larger limit used to handle base64 data URIs
app.use(express.json({ limit: '200mb' }));
app.use(express.json());

app.get('/', (_, result) => {
  result.status(200);
  result.json({ status: 'OK' })
})

// TODO: With the scope of offline functionality changed, we can deprecate this endpoint
// and just use a standard airlock endpoint instead
app.post('/customers/create', async (request, result) => {
  const customerData = request.body;
  console.log("Customer Creation Payload: ", customerData);

  try {
      const { name, customerNumber, meterNumber, meterType, tariffPlanId, siteId, meterReadings, payments, startingMeterReading, startingMeterLastChanged } = customerData;
      const hasMeter = meterNumber ? true : false;
      const isActive = true;

      const airtableCustomerData = {
          isactive: isActive,
          hasmeter: hasMeter,
          tariffPlanId,
          siteId,
          name,
          customerNumber,
          meterNumber,
          startingMeterReading,
          startingMeterLastChanged,
          meterType
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
      result.json({ status: 'OK', id: customerId })
  } catch (err) {
      console.log(err);
      result.status(400);
      result.json({ error: err });
  }
})

// Endpoint used to create a new inventory item.
// Contains a site id (the site already exists in airtable).
app.post("/inventory/create", async (request, result) => {
  try {
    const inventoryData = request.body;
    // Remove the blank id field
    delete inventoryData.id;
    console.log("Inventory data: ", inventoryData);

    const inventoryId = await createInventory(inventoryData);
    console.log("Inventory id:", inventoryId);
    console.log("Inventory created!");

    result.status(201);
    result.json({ status: "OK", id: inventoryId });
  } catch (err) {
    console.log("Error when creating inventory: ", err);
    result.status(400);
    result.json({ error: err });
  }
});

// Endpoint used to create a new MeterReadingAndInvoice record for a customer
// with no meter by charging the value of the Fixed Tariff from their Tariff Plan.
app.post("/meter-readings-invoice/create", async (request, result) => {
  const { customerId } = request.body;
  try {
    const customer = await getCustomerById(customerId);
    const tariffPlan = await getTariffPlanById(customer.tariffPlanId);
    const invoice = {
      customerId: customer.id,
      amountBilled: tariffPlan.fixedTariff,
      date: moment().toISOString(),
      reading: 0,
    }
  
    console.log("Creating invoice:", invoice);
    const invoiceId = await createMeterReadingsandInvoice(invoice);
    console.log("Invoice created! ID:", invoiceId);
    
    result.status(201);
    result.json({ status: 'OK', id: invoiceId })

  } catch (error) {
    console.error("Error creating meter reading and invoice: ", error)
    result.status(400);
    result.json({ status: 'ERROR', error: error })
  }
})

// Note: There are ways to do these calculations with less API requests by adding more lookups to the schema
// however, this job is to be run once a day and is not predicted to be particularly intensive.
app.post("/financial-summaries/update", async (request, result) => {
  const { month, year, siteId } = request.body;

  try {
    const site = await getSiteById(siteId);

    const siteCustomerIds = new Set(site.customerIds);
    const siteCustomers = await getCustomersByIds(site.customerIds);

    const monthlyMeterReadings = await getAllMeterReadingsandInvoices(`AND(MONTH({Date})=${month}, YEAR({Date})=${year})`);
    const siteMonthlyMeterReadings = monthlyMeterReadings.filter(meterReading => siteCustomerIds.has(meterReading.customerId));

    const monthlyPayments = await getAllPayments(`AND(MONTH({Date})=${month}, YEAR({Date})=${year})`);
    const siteMonthlyPayments = monthlyPayments.filter(payment => siteCustomerIds.has(payment.billedToId));

    const allInventory = await getAllInventorys();
    const siteInventory = allInventory.filter(inventory => inventory.siteId === siteId);
    const sitePurchaseRequestIds = [];
    siteInventory.forEach(inventoryItem => sitePurchaseRequestIds.push.apply(sitePurchaseRequestIds, inventoryItem.purchaseRequestIds));
    const siteMonthlyPurchaseRequests = await getPurchaseRequestsByIds(sitePurchaseRequestIds, `AND(MONTH({Created At})=${month}, YEAR({Created At})=${year})`);

    const numActiveCustomers = calculateTotalActiveCustomers(siteCustomers);
    const numCustomersBilled = calculateNumCustomersBilled(siteMonthlyMeterReadings);
    const numCustomersPaid = calculateNumCustomersPaid(siteMonthlyPayments);
    const totalUsage = calculateTotalUsage(siteMonthlyMeterReadings);
    const totalAmountBilled = calculateTotalAmountBilled(siteMonthlyMeterReadings);
    const totalAmountCollected = calculateTotalAmountCollected(siteMonthlyPayments);
    const totalAmountSpent = calculateTotalAmountSpent(siteMonthlyPurchaseRequests);

    console.log(`numActiveCustomers: ${numActiveCustomers},
      numCustomersBilled: ${numCustomersBilled},
      numCustomersPaid: ${numCustomersPaid},
      totalAmountBilled: ${totalAmountBilled},
      totalUsage: ${totalUsage},
      totalAmountCollected: ${totalAmountCollected},
      totalAmountSpent: ${totalAmountSpent}`)

    const financialSummaryObject = {
      siteId: site.id,
      totalCustomers: numActiveCustomers,
      totalCustomersBilled: numCustomersBilled,
      totalCustomersPaid: numCustomersPaid,
      totalUsage: totalUsage,
      totalAmountBilled: totalAmountBilled,
      totalAmountCollected: totalAmountCollected,
      totalAmountSpent: totalAmountSpent,
      period: `${year}-${month}`,
      lastUpdated: moment().toISOString(),
    }

    const financialSummaryList = await getFinancialSummariesByIds(site.financialSummarieIds, `{PERIOD}='${year}-${month}'`);
    const existingFinancialSummary = financialSummaryList[0]; // Returns undefined if list is empty

    // Update existing financial summary if it exists, otherwise create a new one
    let financialSummaryId = '';
    if (existingFinancialSummary) {
      financialSummaryId = await updateFinancialSummarie(existingFinancialSummary.id, financialSummaryObject)
    } else {
      financialSummaryId = await createFinancialSummarie(financialSummaryObject)
    }

    result.status(201);
    result.json({ status: 'OK', id: financialSummaryId })

  } catch (error) {
    console.error("Error in updating financial summary: ", error)
    result.status(400);
    result.json({ status: 'ERROR', error: error })
  }
})

app.listen(port, () => console.log(`Mee Panyar port ${port}!`));
