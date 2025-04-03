const express = require('express');
require('dotenv').config();
const webhookRoutes = require('./routes/webhookRoutes');

const app = express();
app.use(express.json());

app.use('/webhook', webhookRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Webhook server is listening on port ${PORT}`);
});