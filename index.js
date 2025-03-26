const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

app.post('/webhook', async (req, res) => {
    const inventoryItemId = req.body.inventory_item_id;
    const inventoryLevel = req.body.available;

    console.log(inventoryLevel);

    if (inventoryLevel == null) {
        try {
            const response = await axios.get(`${process.env.SHOPIFY_API_URL}/variants.json?inventory_item_id=${inventoryItemId}`, {
                headers: { 'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN }
            });

            if (response.data.variants.length === 0) {
                console.log("No variant found for inventory_item_id:", inventoryItemId);
                return res.sendStatus(404);
            }

            const variantId = response.data.variants[0].id;
            console.log("Variant ID:", variantId);

            const etaDate = "2025-12-31";

            await axios.post(`${process.env.SHOPIFY_API_URL}/variants/${variantId}/metafields/${process.env.METAFIELD_ID}.json`, {
                metafield: {
                    id: process.env.METAFIELD_ID,
                    value: etaDate,
                    type: "date"
                }
            }, {
                headers: { 'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN }
            });
            
            console.log(`Metafield updated with ETA: ${etaDate}`);

            } catch (error) {
                console.error("Error processing webhook:", error.response ? error.response.data : error.message);
        }
    }

    res.sendStatus(200);
})

app.listen(3000, () => {
    console.log('Webhook server is listening on port 3000');
});