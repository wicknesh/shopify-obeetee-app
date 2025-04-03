const axios = require("axios");

const SHOPIFY_API_URL = process.env.SHOPIFY_API_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

async function fetchProductDetails(inventoryItemId) {
    const query = `
        query {
            node(id: "gid://shopify/InventoryItem/${inventoryItemId}") {
                ... on InventoryItem {
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

    const response = await axios.post(`${SHOPIFY_API_URL}/graphql.json`, { query }, {
        headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        },
    });

    // const node = response.data.data.node;
    return {
        sku: response.data.data.node.sku,
        variantId: response.data.data.node.variant.id.split("/").pop(),
        productId: response.data.data.node.variant.product.id.split("/").pop()
    };
}

async function updateVariantMetafield(variantId, etaDate) {
    const query = `
        mutation SetVariantMetafield {
            metafieldsSet(metafields: [
                {
                    ownerId: "gid://shopify/ProductVariant/${variantId}",
                    namespace: "custom",
                    key: "expected_stock_date",
                    value: "${etaDate}", 
                    type: "date"
                }
            ]) {
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

    await axios.post(`${SHOPIFY_API_URL}/graphql.json`, { query }, {
        headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        },
    });

    console.log(`Updated metafield for variant ${variantId} with ETA: ${etaDate}`);
}

async function deleteVariantMetafield(variantId) {
    const query = `
        query GetVariantMetafieldId {
            productVariant(id: "gid://shopify/ProductVariant/${variantId}") {
                metafield(namespace: "custom", key: "expected_stock_date") {
                    id
                }
            }
        }
    `;

    const response = await axios.post(`${SHOPIFY_API_URL}/graphql.json`, { query }, {
        headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        },
    });

    const metafieldId = response.data.data.productVariant.metafield.id.split("/").pop();
    
    if (!metafieldId) {
        console.log(`No metafield found for variant ${variantId}`);
        return;
    }

    const deleteQuery = `
        mutation DeleteVariantMetafield {
            metafieldDelete(input: { id: "gid://shopify/Metafield/${metafieldId}" }) {
                deletedId
                userErrors {
                    field
                    message
                }
            }
        }
    `;

    await axios.post(`${SHOPIFY_API_URL}/graphql.json`, { query: deleteQuery }, {
        headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        },
    });

    console.log(`Deleted metafield ${metafieldId} for variant ${variantId}`);
}

module.exports = { fetchProductDetails, updateVariantMetafield, deleteVariantMetafield };