const axios = require('axios');

const OBEETEE_EXT_API = process.env.OBEETEE_EXT_API;

async function fetchETA(sku) {
    const response = await axios.get(`${OBEETEE_EXT_API}=${sku}`);
    return response.data.items[0].ESTIMATED_ARRIVAL_DATE.split("T")[0];
}

module.exports = { fetchETA };