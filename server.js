require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const generatePromptPayPayload = require('promptpay-qr');
const QRCode = require('qrcode');

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const SHIPDAY_API_URL = (process.env.SHIPDAY_API_URL || 'https://api.shipday.com').replace(/\/$/, '');
const SHIPDAY_API_KEY = process.env.SHIPDAY_API_KEY || '';
const PROMPTPAY_ID = process.env.PROMPTPAY_ID || '';
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || '';
const DELIVERY_BASE_FEE = Number(process.env.DELIVERY_BASE_FEE ?? 20);
const DELIVERY_FREE_KM = Number(process.env.DELIVERY_FREE_KM ?? 3);
const DELIVERY_PER_KM = Number(process.env.DELIVERY_PER_KM ?? 5);
const DATA_FILE = path.resolve(process.env.DATA_FILE || path.join(__dirname, 'data', 'orders.json'));

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(express.static(__dirname, { extensions: ['html'] }));

function loadOrders() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('[orders] Cannot read data file:', error.message);
    return {};
  }
}

const activeOrders = loadOrders();

function saveOrders() {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(activeOrders, null, 2));
    fs.renameSync(tempFile, DATA_FILE);
  } catch (error) {
    console.error('[orders] Cannot persist order state:', error.message);
  }
}

function cleanText(value, maxLength = 300) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeThaiPhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.startsWith('66')) return `+${digits}`;
  if (digits.startsWith('0')) return `+66${digits.slice(1)}`;
  return digits ? `+${digits}` : '';
}

function utcDateTimeAfter(minutes) {
  const iso = new Date(Date.now() + minutes * 60_000).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 19) };
}

function calculatePricing(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const subtotal = items.reduce((sum, item) => {
    const quantity = Math.max(1, Math.trunc(toNumber(item.quantity, 1)));
    return sum + Math.max(0, toNumber(item.unitPrice)) * quantity;
  }, 0);
  const promoCode = cleanText(order.promoCode, 30).toUpperCase();
  let discount = 0;
  if (promoCode === 'WANGOFREE') discount = 15;
  if (promoCode === 'WANGO50' && subtotal >= 200) discount = 50;
  if (promoCode === 'LOCAL10') discount = Math.round(subtotal * 0.1);
  return { subtotal, discount: Math.min(subtotal, discount), promoCode };
}

function formatShipdayPayload(order) {
  const items = Array.isArray(order.items) ? order.items.slice(0, 100) : [];
  const { subtotal, discount } = calculatePricing({ ...order, items });
  const pickup = utcDateTimeAfter(15);
  const delivery = utcDateTimeAfter(45);

  return {
    orderNumber: cleanText(order.orderNumber, 80),
    customerName: cleanText(order.customerName, 120),
    customerAddress: cleanText(order.customerAddress, 500),
    customerPhoneNumber: normalizeThaiPhone(order.customerPhone),
    customerEmail: cleanText(order.customerEmail, 200),
    restaurantName: cleanText(order.restaurantName, 150),
    restaurantAddress: cleanText(order.restaurantAddress, 500),
    restaurantPhoneNumber: normalizeThaiPhone(order.restaurantPhone),
    deliveryLatitude: toNumber(order.latitude),
    deliveryLongitude: toNumber(order.longitude),
    orderItem: items.map((item) => ({
      name: cleanText(`${item.name}${item.portion ? ` (${item.portion})` : ''}`, 200),
      unitPrice: toNumber(item.unitPrice),
      quantity: Math.max(1, Math.trunc(toNumber(item.quantity, 1))),
      detail: cleanText([
        item.spice ? `ระดับความเผ็ด: ${item.spice}` : '',
        item.notes || ''
      ].filter(Boolean).join(' | '), 300)
    })),
    totalOrderCost: Math.max(0, subtotal - discount),
    discountAmount: discount,
    tax: 0,
    deliveryFee: 0,
    tips: 0,
    paymentMethod: 'cash',
    orderSource: 'WANGO Delivery',
    deliveryInstruction: cleanText(order.customerNotes || 'ส่งถึงหน้าบ้าน', 500),
    expectedDeliveryDate: delivery.date,
    expectedPickupTime: pickup.time,
    expectedDeliveryTime: delivery.time
  };
}

function validateOrder(order, payload) {
  const missing = [];
  if (!payload.orderNumber) missing.push('orderNumber');
  if (!payload.customerName) missing.push('customerName');
  if (!payload.customerAddress) missing.push('customerAddress');
  if (!payload.customerPhoneNumber) missing.push('customerPhone');
  if (!payload.restaurantName) missing.push('restaurantName');
  if (!payload.restaurantAddress) missing.push('restaurantAddress');
  if (!Array.isArray(order.items) || order.items.length === 0) missing.push('items');
  return missing;
}

async function shipdayRequest(apiPath, options = {}) {
  if (!SHIPDAY_API_KEY) {
    const error = new Error('Server is missing SHIPDAY_API_KEY');
    error.status = 503;
    throw error;
  }

  const response = await fetch(`${SHIPDAY_API_URL}${apiPath}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${SHIPDAY_API_KEY}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    },
    signal: AbortSignal.timeout(15_000)
  });

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!response.ok) {
    const error = new Error(`Shipday returned HTTP ${response.status}`);
    error.status = 502;
    error.shipdayStatus = response.status;
    error.shipdayResponse = data;
    throw error;
  }
  return data;
}

function unwrapShipdayOrder(value) {
  if (Array.isArray(value)) return value[0] || null;
  if (Array.isArray(value?.orders)) return value.orders[0] || null;
  return value || null;
}

function getStatusName(raw) {
  const status = raw?.orderStatus;
  if (typeof status === 'string') return status.toUpperCase();
  return cleanText(status?.orderState || status?.status || raw?.status || raw?.orderState, 80).toUpperCase();
}

function calculateDeliveryFee(distance, shipdayFee) {
  const apiFee = toNumber(shipdayFee, -1);
  if (apiFee > 0) return apiFee;
  const chargeableKm = Math.max(0, toNumber(distance) - DELIVERY_FREE_KM);
  return Math.max(0, DELIVERY_BASE_FEE + Math.ceil(chargeableKm) * DELIVERY_PER_KM);
}

function mergeShipdayStatus(local, shipdayValue) {
  const raw = unwrapShipdayOrder(shipdayValue);
  if (!raw) return local;

  const carrier = raw.assignedCarrier || raw.carrier || raw.driver || null;
  const carrierId = toNumber(raw.assignedCarrierId ?? carrier?.id, -1);
  const statusName = getStatusName(raw);
  const distance = toNumber(raw.distance ?? raw.deliveryDistance);
  const hasCarrier = carrierId > 0 || Boolean(carrier?.name || carrier?.phoneNumber || carrier?.phone);
  const pendingStatus = /^(NOT_|UNASSIGNED|PENDING)/.test(statusName);
  const assignedByStatus = !pendingStatus && /ASSIGNED|ACCEPTED|STARTED|PICKED|READY_TO_DELIVER|DELIVERING/.test(statusName);
  const delivered = /ALREADY_DELIVERED|DELIVERED|COMPLETED/.test(statusName);
  const failed = /FAILED|INCOMPLETE|CANCEL/.test(statusName);

  local.shipdayStatus = statusName || local.shipdayStatus || 'NOT_ASSIGNED';
  local.distance = distance || local.distance || 0;
  local.updatedAt = new Date().toISOString();

  if (hasCarrier) {
    local.driver = {
      name: cleanText(carrier.name || `${carrier.firstName || ''} ${carrier.lastName || ''}`) || 'ไรเดอร์ Shipday',
      phone: cleanText(carrier.phoneNumber || carrier.phone || ''),
      plate: cleanText(carrier.vehicleNumber || carrier.licensePlate || carrier.vehicleType || 'ไรเดอร์ Shipday'),
      distance: `${(distance || 0).toFixed(1)} กม.`
    };
  }

  if ((hasCarrier || assignedByStatus) && !failed) {
    local.deliveryFee = calculateDeliveryFee(distance, raw.costing?.deliveryFee ?? raw.deliveryFee);
    local.grandTotal = Math.max(0, toNumber(local.subtotal) + local.deliveryFee - toNumber(local.discount));
    if (!local.paymentMethod) local.statusPhase = 'PAYMENT_REQUIRED';
  }

  if (local.paymentMethod && !delivered && !failed) local.statusPhase = 'DELIVERING';
  if (delivered) local.statusPhase = 'COMPLETED';
  if (failed) local.statusPhase = 'FAILED';

  if (/PICKED|READY_TO_DELIVER/.test(statusName)) local.statusStep = 4;
  else if (/STARTED/.test(statusName)) local.statusStep = 3;
  else if (hasCarrier || assignedByStatus) local.statusStep = 2;
  if (delivered) local.statusStep = 5;

  local.trackingUrl = raw.trackingLink || local.trackingUrl || null;
  return local;
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    shipdayConfigured: Boolean(SHIPDAY_API_KEY),
    promptPayConfigured: Boolean(PROMPTPAY_ID),
    timestamp: new Date().toISOString()
  });
});

app.post('/api/orders', async (req, res) => {
  const payload = formatShipdayPayload(req.body || {});
  const missing = validateOrder(req.body || {}, payload);
  if (missing.length) {
    return res.status(400).json({ success: false, error: `ข้อมูลไม่ครบ: ${missing.join(', ')}` });
  }

  try {
    const shipdayResult = await shipdayRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (shipdayResult?.success === false) {
      return res.status(502).json({ success: false, error: shipdayResult.response || 'Shipday did not accept the order' });
    }

    const pricing = calculatePricing(req.body);
    const order = {
      ...req.body,
      orderNumber: payload.orderNumber,
      customerPhone: payload.customerPhoneNumber,
      restaurantPhone: payload.restaurantPhoneNumber,
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      promoCode: pricing.promoCode,
      deliveryFee: null,
      grandTotal: Math.max(0, pricing.subtotal - pricing.discount),
      statusPhase: 'WAITING_FOR_DRIVER',
      statusStep: 1,
      shipdayStatus: 'NOT_ASSIGNED',
      shipdayOrderId: shipdayResult?.orderId || null,
      trackingUrl: shipdayResult?.trackingLink || null,
      paymentMethod: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    activeOrders[order.orderNumber] = order;
    saveOrders();
    return res.status(201).json({ success: true, order });
  } catch (error) {
    console.error('[Shipday create order]', error.message, error.shipdayResponse || '');
    return res.status(error.status || 500).json({
      success: false,
      error: error.message,
      details: error.shipdayResponse || undefined
    });
  }
});

app.get('/api/orders/:orderNumber', async (req, res) => {
  const orderNumber = cleanText(req.params.orderNumber, 80);
  let order = activeOrders[orderNumber] || null;

  try {
    const shipdayResult = await shipdayRequest(`/orders/${encodeURIComponent(orderNumber)}`);
    if (!order) {
      const raw = unwrapShipdayOrder(shipdayResult);
      if (!raw) return res.status(404).json({ error: 'ไม่พบออเดอร์' });
      order = {
        orderNumber,
        items: [],
        subtotal: toNumber(raw.costing?.orderTotal ?? raw.orderTotal),
        discount: toNumber(raw.costing?.discount ?? raw.discount),
        statusPhase: 'WAITING_FOR_DRIVER',
        statusStep: 1,
        paymentMethod: null
      };
    }
    mergeShipdayStatus(order, shipdayResult);
    activeOrders[orderNumber] = order;
    saveOrders();
    return res.json(order);
  } catch (error) {
    if (order) {
      return res.json({ ...order, syncWarning: 'ไม่สามารถอัปเดตสถานะจาก Shipday ได้ชั่วคราว' });
    }
    return res.status(error.status || 500).json({ error: error.message });
  }
});

app.post('/api/orders/:orderNumber/pay', (req, res) => {
  const order = activeOrders[cleanText(req.params.orderNumber, 80)];
  const paymentMethod = cleanText(req.body?.paymentMethod, 20).toUpperCase();
  if (!order) return res.status(404).json({ success: false, error: 'ไม่พบออเดอร์' });
  if (!['PROMPTPAY', 'COD'].includes(paymentMethod)) {
    return res.status(400).json({ success: false, error: 'รูปแบบการชำระเงินไม่ถูกต้อง' });
  }
  if (order.statusPhase !== 'PAYMENT_REQUIRED') {
    return res.status(409).json({ success: false, error: 'ออเดอร์ยังไม่พร้อมรับการชำระเงิน' });
  }

  order.paymentMethod = paymentMethod;
  order.paymentConfirmedAt = new Date().toISOString();
  order.statusPhase = 'DELIVERING';
  order.statusStep = Math.max(2, toNumber(order.statusStep, 2));
  order.updatedAt = new Date().toISOString();
  saveOrders();
  return res.json({ success: true, order });
});

app.get('/api/orders/:orderNumber/promptpay-qr', async (req, res) => {
  const order = activeOrders[cleanText(req.params.orderNumber, 80)];
  if (!order) return res.status(404).json({ error: 'ไม่พบออเดอร์' });
  if (!PROMPTPAY_ID) return res.status(503).json({ error: 'ยังไม่ได้ตั้งค่า PROMPTPAY_ID' });
  if (order.statusPhase !== 'PAYMENT_REQUIRED') return res.status(409).json({ error: 'ออเดอร์ยังไม่พร้อมชำระเงิน' });

  try {
    const payload = generatePromptPayPayload(PROMPTPAY_ID, { amount: toNumber(order.grandTotal) });
    const image = await QRCode.toBuffer(payload, { type: 'png', width: 360, margin: 2, errorCorrectionLevel: 'M' });
    res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
    return res.send(image);
  } catch (error) {
    return res.status(500).json({ error: 'สร้าง QR พร้อมเพย์ไม่สำเร็จ' });
  }
});

app.post('/api/shipday-webhook', (req, res) => {
  if (WEBHOOK_TOKEN) {
    const token = req.get('x-webhook-token') || req.query.token;
    if (token !== WEBHOOK_TOKEN) return res.status(401).json({ received: false });
  }

  const event = req.body || {};
  const orderNumber = cleanText(event.orderNumber || event.order?.orderNumber, 80);
  if (orderNumber && activeOrders[orderNumber]) {
    mergeShipdayStatus(activeOrders[orderNumber], event.order || event);
    saveOrders();
  }
  return res.status(200).json({ received: true });
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  return res.sendFile(path.join(__dirname, 'index.html'));
});

app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));

app.listen(PORT, () => {
  console.log(`WANGO Delivery listening on port ${PORT}`);
  console.log(`Shipday: ${SHIPDAY_API_KEY ? 'configured' : 'MISSING SHIPDAY_API_KEY'}`);
  console.log(`PromptPay: ${PROMPTPAY_ID ? 'configured' : 'MISSING PROMPTPAY_ID'}`);
});
