import { getMeterReadingsandInvoicesByIds } from '../airtable/request';

// Gets the latest meter reading for a customer by making an API call for meter readings.
// Returns null if the customer has not had their meter read yet according to Airtable
export const getLatestMeterReadingForCustomer = async (customer) => {
    const meterReadingIds = customer.meterReadingIds;

    if (!meterReadingIds || meterReadingIds.length === 0) {
        return null
    }

    try {
        const latestMeterReadings = await getMeterReadingsandInvoicesByIds(meterReadingIds, '', [{ field: "Date", direction: "desc" }]);
        return latestMeterReadings.length > 0 ? latestMeterReadings[0] : null;
    } catch (error) {
        console.error('(getLatestMeterReadingForCustomer) Error occurred while fetching the latest meter reading for customer: ', error);
    }
}