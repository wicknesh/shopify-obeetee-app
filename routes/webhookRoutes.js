const express = require('express');
const router = express.Router();
const { fetchProductDetails, updateVariantMetafield, deleteVariantMetafield } = require('../services/shopifyService.js');
const { fetchETA } = require('../services/obeeteeService.js');

router.post('/', async (req, res) => {
    const { available: inventoryLevel, inventory_item_id: inventoryItemId } = req.body;

    try {
        const { sku, variantId, productId } = await fetchProductDetails(inventoryItemId);

        console.log("SKU:", sku);
        console.log("Product ID:", productId);
        console.log("Variant ID:", variantId);

        if(inventoryLevel <= 0) {
            try {
                // const etaDate = await fetchETA(sku);
                const etaDate = "2025-10-10";
                await updateVariantMetafield(variantId, etaDate);
            } catch (error) {
                console.error("Error updating metafield", error.response ? error.response.data : error.message);
            }
        } else {
            await deleteVariantMetafield(variantId);
        }

        res.sendStatus(200);
    } catch (error) {
        console.error("Error processing webhook", error.response ? error.response.data : error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;