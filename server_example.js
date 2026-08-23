/**
 * WANGO - Delivery | Backend & Shipday Integration Server
 * Full 4-Phase Lifecycle: Order Submission -> Rider Quote -> Payment / COD -> Out for Delivery
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

// In-memory active orders store for real-time tracking
const activeOrders = {};

/**
 * 1. Submit Order to Shipday (Step 1)
 * POST /api/orders
 */
app.post('/api/orders', async (req, res) => {
  try {
    const orderData = req.body;
    console.log(`[WANGO Dispatch] Received new order #${orderData.orderNumber}`);

    activeOrders[orderData.orderNumber] = {
      ...orderData,
      statusPhase: 'WAITING_FOR_DRIVER',
      deliveryFee: null,
      updatedAt: new Date().toISOString()
    };

    if (SHIPDAY_API_KEY) {
      try {
        const response = await axios.post(`${SHIPDAY_API_URL}/orders`, orderData, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${SHIPDAY_API_KEY}`
          }
        });
        console.log('[Shipday Response]:', response.data);
      } catch (apiErr) {
        console.warn('[Shipday API Warning]:', apiErr.message);
      }
    }

    res.json({
      success: true,
      orderNumber: orderData.orderNumber,
      status: 'WAITING_FOR_DRIVER',
      message: 'Order dispatched to Shipday driver queue.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create order', details: err.message });
  }
});

/**
 * 2. Shipday Webhook Receiver (Step 2 & Step 3)
 * POST /api/shipday-webhook
 */
app.post('/api/shipday-webhook', (req, res) => {
  const event = req.body;
  const orderNumber = event.orderNumber;

  console.log('==============================================');
  console.log('[Shipday Webhook Received]:', new Date().toISOString());
  console.log('Event Type:', event.eventType || event.action || event.status);
  console.log('Order Details:', JSON.stringify(event, null, 2));
  console.log('==============================================');

  if (orderNumber && activeOrders[orderNumber]) {
    // When Rider Accepts and quotes delivery fee
    if (event.deliveryFee) {
      activeOrders[orderNumber].deliveryFee = parseFloat(event.deliveryFee);
      activeOrders[orderNumber].statusPhase = 'PAYMENT_REQUIRED';
    }

    if (event.driver) {
      activeOrders[orderNumber].driver = event.driver;
    }

    activeOrders[orderNumber].statusStep = event.statusStep || activeOrders[orderNumber].statusStep;
  }

  res.status(200).json({ received: true });
});

/**
 * 3. Order Status & Fee Polling Endpoint for Frontend
 * GET /api/orders/:orderNumber
 */
app.get('/api/orders/:orderNumber', (req, res) => {
  const order = activeOrders[req.params.orderNumber];
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

/**
 * 4. Confirm Customer Payment (PromptPay or Cash COD)
 * POST /api/orders/:orderNumber/pay
 */
app.post('/api/orders/:orderNumber/pay', (req, res) => {
  const { paymentMethod } = req.body; // 'PROMPTPAY' or 'COD'
  const order = activeOrders[req.params.orderNumber];

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  order.paymentMethod = paymentMethod;
  order.statusPhase = 'DELIVERING';
  order.statusStep = 2; // Cooking & Driver Heading to Restaurant

  console.log(`[Payment Update] Order #${order.orderNumber} confirmed with ${paymentMethod}! Driver dispatched.`);

  res.json({ success: true, order });
});

app.listen(PORT, () => {
  console.log(`🚀 WANGO Full-Lifecycle Server running at: http://localhost:${PORT}`);
  console.log(`📡 Ready for Shipday Webhooks at: /api/shipday-webhook`);
});
