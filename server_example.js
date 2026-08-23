/**
 * WANGO - Delivery | Backend & Shipday Integration Server
 * Security: Uses environment variables only. No hardcoded secrets.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 4000;
const SHIPDAY_API_KEY = process.env.SHIPDAY_API_KEY;
const SHIPDAY_API_URL = 'https://api.shipday.com';

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

app.post('/api/orders', async (req, res) => {
  try {
    const orderData = req.body;
    console.log(`[WANGO Dispatch] Processing order #${orderData.orderNumber}...`);

    if (!SHIPDAY_API_KEY) {
      return res.json({
        success: true,
        orderId: Math.floor(800000 + Math.random() * 100000),
        orderNumber: orderData.orderNumber,
        trackingUrl: `https://track.shipday.com/live/${orderData.orderNumber.toLowerCase()}`,
        status: 'DISPATCHED_SIMULATED',
        message: 'Order received and simulated for Wan Yai dispatch.'
      });
    }

    const shipdayResponse = await axios.post(`${SHIPDAY_API_URL}/orders`, orderData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${SHIPDAY_API_KEY}`
      }
    });

    res.json({
      success: true,
      shipdayData: shipdayResponse.data,
      trackingUrl: `https://track.shipday.com/live/${orderData.orderNumber}`
    });
  } catch (err) {
    console.error('[Shipday Error]:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to dispatch order', details: err.message });
  }
});

app.post('/api/shipday-webhook', (req, res) => {
  const event = req.body;
  console.log('[Shipday Webhook Received]:', event.eventType || event.status);
  res.status(200).json({ received: true });
});

app.listen(PORT, () => {
  console.log(`🚀 WANGO Server running at: http://localhost:${PORT}`);
});
