import { getMeterReadingsandInvoicesByIds } from '../airtable/request';

export const getLatestMeterReadingForCustomer = async (customer) => {
    const meterReadingIds = customer.meterReadingIds;

    if (!meterReadingIds || meterReadingIds.length === 0) {
        return null
    }

    // Get Latest Meter Reading for customer
    try {
        const latestMeterReadings = await getMeterReadingsandInvoicesByIds(meterReadingIds, '', [{ field: "Date", direction: "desc" }]);
        return latestMeterReadings.length > 0 ? latestMeterReadings[0] : null;
    } catch (error) {
        console.error('Error occurred while fetching the latest meter reading for customer: ', error);
    }
}