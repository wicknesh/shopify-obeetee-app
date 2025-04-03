const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

app.post('/webhook', async (req, res) => {

    const inventoryLevel = req.body.available;
    const inventoryItemId = req.body.inventory_item_id;
    let sku;
    let productId;
    let variantId;


    try {
        // Fetch the variant ID and product ID using the InventoryItem ID
        const query = `
        query {
            node(id: "gid://shopify/InventoryItem/${inventoryItemId}") {
                ... on InventoryItem {
                    id
                    sku
                    variant {
                        id
                        product {
                            id
                        }
                    }
                }
            }
        }
        `;

        const response = await axios.post(`${process.env.SHOPIFY_API_URL}/graphql.json`,
            { query },
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
                },
            }
        );

        // Extract the variant ID and product ID from the response
        sku = response.data.data.node.sku;
        variantId = response.data.data.node.variant.id.split("/").pop();
        productId = response.data.data.node.variant.product.id.split("/").pop();

        console.log("SKU: ", sku);
        console.log("Product ID: ", productId);
        console.log("Variant ID: ", variantId);
    } catch (error) {
        console.error("Error fetching IDs", error.response ? error.response.data : error.message);
    }

    if (inventoryLevel <= 0) {
        try {
            // Fetch ETA date from Obeetee external API
            const etaResponse = await axios.get(`${process.env.OBEETEE_EXT_API}=${sku}`);
            const etaDate = etaResponse.data.items[0].ESTIMATED_ARRIVAL_DATE.split("T")[0];

            // Update the metafield for the variant with the ETA date
            const metafieldQuery = `
                mutation SetVariantMetafield {
                    metafieldsSet(metafields: [
                    {
                        ownerId: "gid://shopify/ProductVariant/${variantId}",
                        namespace: "custom",
                        key: "expected_stock_date",
                        value: "${etaDate}", 
                        type: "date"
                    }]) 
                    {
                        metafields {
                            id
                            namespace
                            key
                            value
                        }
                        userErrors {
                            field
                            message
                        }
                    }
                }
            `;

            await axios.post(`${process.env.SHOPIFY_API_URL}/graphql.json`,
                { query: metafieldQuery },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
                    },
                }
            );
        } catch (error) {
            console.error("Error processing webhook:", error.response ? error.response.data : error.message);
            }
       // if inventorylevel is greater than or equal to 1, delete the metafield
    } else if (inventoryLevel >= 1) {
        try {
            // Fetch the metafield ID for the variant
            const getVariantMetafieldId = `
                query GetVariantMetafieldId {
                    productVariant(id: "gid://shopify/ProductVariant/${variantId}") {
                        metafield(namespace: "custom", key: "expected_stock_date") {
                            id
                        }
                    }
                }
            `;

            const response = await axios.post(`${process.env.SHOPIFY_API_URL}/graphql.json`,
                { query: getVariantMetafieldId },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
                    },
                }
            );
            
            // Extract the metafield ID from the response
            const variantMetafieldId = response.data.data.productVariant.metafield.id.split("/").pop();
            console.log(`Variant Metafield ID:`, variantMetafieldId);

            // Delete the metafield for the variant
            const deleteVariantMetafield = `
                mutation DeleteVariantMetafield {
                    metafieldDelete(input: {
                        id: "gid://shopify/Metafield/${variantMetafieldId}" # Replace with the retrieved metafield ID
                    }) {
                            deletedId
                            userErrors {
                                field
                                message
                            }
                        }
                }
            `;

            await axios.post(`${process.env.SHOPIFY_API_URL}/graphql.json`,
                { query: deleteVariantMetafield },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
                    },
                }
            );

            console.log("Metafield Deletion Response:", response.data);
        } catch (error) {
            console.error("Error processing webhook:", error.response ? error.response.data : error.message);
        }
    }

    res.sendStatus(200);
})


app.listen(3000, () => {
    console.log('Webhook server is listening on port 3000');
});