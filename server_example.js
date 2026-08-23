/**
 * WANGO - Delivery - Node.js / Express Backend & Shipday Integration Server
 * Configured with User Shipday API Key
 *
 * Install dependencies:
 *   npm install express cors dotenv axios
 *
 * Run:
 *   node server_example.js
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 4000;

// Configured Shipday API Key
const SHIPDAY_API_KEY = process.env.SHIPDAY_API_KEY || '4jV7ikfZha.2FSbpIR9Z5h6z0F67JY2';
const SHIPDAY_API_URL = 'https://api.shipday.com';

app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serves frontend index.html

/**
 * 1. Create Order & Dispatch directly to Shipday
 * Endpoint: POST /api/orders
 */
app.post('/api/orders', async (req, res) => {
  try {
    const orderData = req.body;

    console.log(`[WANGO - Delivery] Dispatching order #${orderData.orderNumber} to Shipday...`);

    // Call Real Shipday API
    const shipdayResponse = await axios.post(`${SHIPDAY_API_URL}/orders`, orderData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${SHIPDAY_API_KEY}`
      }
    });

    console.log('[Shipday API Response]:', shipdayResponse.data);

    res.json({
      success: true,
      shipdayData: shipdayResponse.data,
      trackingUrl: `https://track.shipday.com/live/${orderData.orderNumber}`
    });
  } catch (err) {
    console.error('[Shipday API Error]:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Failed to dispatch order to Shipday',
      details: err.response?.data || err.message
    });
  }
});

/**
 * 2. Shipday Webhook Receiver Endpoint
 * Endpoint: POST /api/shipday-webhook
 * 
 * นำ URL ของ endpoint นี้ (เช่น https://yourdomain.com/api/shipday-webhook)
 * ไปใส่ใน Shipday Dashboard > Settings > Integrations > Webhook
 */
app.post('/api/shipday-webhook', (req, res) => {
  const event = req.body;
  console.log('==============================================');
  console.log('[Shipday Webhook Event Received]:', new Date().toISOString());
  console.log('Event Type / Action:', event.eventType || event.action || event.status);
  console.log('Order Details:', JSON.stringify(event, null, 2));
  console.log('==============================================');

  // จัดการสถานะตามที่ Shipday ส่งมา:
  // - ORDER_INSERTED : ได้รับออเดอร์ในระบบ Shipday แล้ว
  // - ORDER_ASSIGNED : จ่ายงานให้ไรเดอร์แล้ว
  // - ORDER_ACCEPTED : ไรเดอร์กดรับงาน
  // - ORDER_PICKED_UP : ไรเดอร์รับอาหารจากร้านแล้ว กำลังเดินทางไปส่ง
  // - ORDER_DELIVERED : ส่งอาหารสำเร็จ
  // - ORDER_CANCELLED : ยกเลิกออเดอร์

  res.status(200).json({ received: true, message: 'Webhook processed successfully' });
});

app.listen(PORT, () => {
  console.log(`🚀 WANGO - Delivery Server running at: http://localhost:${PORT}`);
  console.log(`🔑 Shipday API Key: ${SHIPDAY_API_KEY.slice(0, 8)}... (Configured)`);
  console.log(`📡 Webhook Endpoint: http://localhost:${PORT}/api/shipday-webhook`);
});
