
export const calculateTotalActiveCustomers = (siteCustomers) => {
    return siteCustomers.reduce((totalActive, customer) => customer.isactive ? totalActive + 1 : totalActive, 0)
}

export const calculateNumCustomersBilled = (monthlyMeterReadings) => {
    const billedCustomers = new Set();
    monthlyMeterReadings.forEach(meterReading => billedCustomers.add(meterReading.customerId));
    return billedCustomers.size;
}

// Calculates the total number of customers who made a payment in the billing period.
// Does NOT calculate if the customer paid off the entire monthly bill
export const calculateNumCustomersPaid = (monthlyPayments) => {
    const paidCustomers = new Set();
    monthlyPayments.forEach(payment => paidCustomers.add(payment.billedToId))
    return paidCustomers.size;
}

export const calculateTotalAmountBilled = (monthlyMeterReadings) => {
    return monthlyMeterReadings.reduce((totalAmountBilled, meterReading) => totalAmountBilled + meterReading.amountBilled, 0);
}

export const calculateTotalUsage = (monthlyMeterReadings) => {
    return monthlyMeterReadings.reduce((totalUsage, meterReading) => totalUsage + meterReading.reading, 0);
}

export const calculateTotalAmountCollected = (monthlyPayments) => {
    return monthlyPayments.reduce((totalAmountCollected, payment) => totalAmountCollected + payment.amount, 0);
}

export const calculateTotalAmountApproved = (monthlyPurchaseRequests) => {
    let totalAmountSpent = 0;
    monthlyPurchaseRequests.forEach(purchaseRequest => {
        if (purchaseRequest.status === 'Approved') {
            totalAmountSpent = totalAmountSpent + purchaseRequest.amountSpent
        }
    })

    return totalAmountSpent
}

export const calculateTotalAmountDenied = (monthlyPurchaseRequests) => {
    let totalAmountSpent = 0;
    monthlyPurchaseRequests.forEach(purchaseRequest => {
        if (purchaseRequest.status === 'Denied') {
            totalAmountSpent = totalAmountSpent + purchaseRequest.amountSpent
        }
    })

    return totalAmountSpent
}
