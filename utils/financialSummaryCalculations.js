import {
    getAllCustomers,
    getPaymentsByIds,
    getMeterReadingsandInvoicesByIds,
    getTariffPlansByIds
} from '../airtable/requests';

export const calculateFinancialSummaryInfo = async () => {
    const today = new Date();
    // todo: how would we be able to allow the billing period dates to change? assumed billing period starts on first of current month
    const billingPeriodStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // todo: this calculates information for every customer in airtable and not by site; need to change to consider user's site
    const customers = await getAllCustomers();
    const totalCustomers = customers.length;
    let totalCustomersBilled = 0;
    let totalCustomersPaid = 0;
    let totalUsage = 0;
    let totalAmountCollected = 0;
    let totalAmountBilled = 0;
    let totalAmountSpent = 0;

    for (const customer of customers) {
        const tariffPlan = await getTariffPlanForCustomer(customer);
        const meterReadings = await getMeterReadingsForCustomer(customer);
        if (meterReadings.length != 0) {
            const latestMeterReadingDate = new Date(meterReadings[0].date);
            if (latestMeterReadingDate >= billingPeriodStart) {
                let currentPeriodUsage = calculateTotalUsageForCustomer(meterReadings);
                totalUsage += currentPeriodUsage;
                totalAmountBilled += calculateTotalAmountBilledForCustomer(currentPeriodUsage, tariffPlan);
                totalCustomersBilled += 1;
            }
        }
        const payments = await getPaymentsForCustomer(customer);
        if (payments.length != 0) {
            const latestPayment = payments[0];
            const latestPaymentDate = new Date(latestPayment.date);
            if (latestPaymentDate >= billingPeriodStart) {
                totalCustomersPaid += 1;
                totalAmountCollected += latestPayment.amount;
            }
        }
    }
    const totalProfit = totalAmountCollected - totalAmountSpent;
    // todo: how to consider even past remaining owed not within this period? this would only calculate the remaining owed
    // from the current period rather than from this and past periods (also not sure if this is how to calculate remaining owed)
    const totalRemainingOwed = totalAmountBilled - totalAmountCollected;
    return { totalCustomers, totalCustomersBilled, totalCustomersPaid, totalUsage, totalAmountCollected, totalAmountBilled, totalAmountSpent, totalProfit, totalRemainingOwed };
};

// Grab meter readings for a specific customer
const getMeterReadingsForCustomer = async (customer) => {
    const meterReadingIds = customer.meterReadingIds;
    let meterReadings = [];
  
    if (meterReadingIds) {
      meterReadings = await getMeterReadingsandInvoicesByIds(meterReadingIds, '', [{field: "Date", direction: "desc"}]);
    }
  
    return meterReadings;
  };
  
// Grab payments for a specific customer
const getPaymentsForCustomer = async (customer) => {
    const paymentIds = customer.paymentIds;
    let payments = [];
  
    if (paymentIds) {
      payments = await getPaymentsByIds(paymentIds, '', [{field: "Date", direction: "desc"}]);
    }
  
    return payments;
};

// Grab tariff plan for a specific customer
const getTariffPlanForCustomer = async (customer) => {
    const tariffPlanId = [customer.tariffPlansId];
    let tariffPlan = [];
      
    if (tariffPlanId) {
        tariffPlan = await getTariffPlansByIds(tariffPlanId);
    }
      
    return tariffPlan;
};

// Calculate usage for current period based on current meter reading and previous meter reading
const calculateTotalUsageForCustomer = (meterReadings) => {
    return meterReadings.length == 1 ? meterReadings[0].reading : meterReadings[0].reading - meterReadings[1].reading;
};

// Calculate amount billed for customer based on tariff plan
const calculateTotalAmountBilledForCustomer = (currentPeriodUsage, tariffPlan) => {
    // todo: verify how to calculate amount billed because don't quite remember how that works
    let amountBilled = tariffPlan.fixedTariff;
    if (currentPeriodUsage > tariffPlan.minUnits) {
        amountBilled += (currentPeriodUsage - tariffPlan.minUnits) * tariffPlan.tariffByUnit;
    }
    return amountBilled;
};