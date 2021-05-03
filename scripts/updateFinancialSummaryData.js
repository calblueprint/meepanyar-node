const moment = require('moment');
const fetch = require('node-fetch');
const { getAllSites } = require('../airtable/request');

require('dotenv').config()


const SERVER_URL = process.env.SERVER_URL;

// It recalculates and updates financial summary data for all sites.
// This script is to be run once a day (can be set up as a cron job via something like Heroku Scheduler).
const updateFinancialSummaryData = async () => {
    const currentDate = moment();
    const currentMonth = currentDate.format('MM');
    const currentYear = currentDate.format('YYYY');
    const yesterday = currentDate.subtract(1, 'day');

    const sites = await getAllSites();

    sites.forEach(async (site) => {
        updateFinancialSummaryDataForSite(site.id, currentMonth, currentYear);

        // Finalize the previous month's financial summary at the start of every month
        if (yesterday.format('MM') !== currentMonth) {
            updateFinancialSummaryDataForSite(site.id, yesterday.format('MM'), yesterday.format('YYYY'))
        }
    });
}

const updateFinancialSummaryDataForSite = async (siteId, month, year) => {
    const url = `${SERVER_URL}/financial-summaries/update`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ siteId, month, year })
    });
    console.log(`Financial summary update for site: ${siteId}, response: ${response}`);
}


updateFinancialSummaryData();