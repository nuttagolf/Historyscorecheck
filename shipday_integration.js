/**
 * Shipday API Integration Module for WANGO - Delivery
 * Configured with API Key: 4jV7ikfZha.2FSbpIR9Z5h6z0F67JY2
 */

class ShipdayService {
  constructor(apiKey = '4jV7ikfZha.2FSbpIR9Z5h6z0F67JY2', baseUrl = 'https://api.shipday.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async insertOrder(orderData) {
    const payload = this.formatOrderPayload(orderData);

    try {
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.apiKey}`,
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Shipday API Error (${response.status}): ${errorBody}`);
      }

      const result = await response.json();
      return {
        success: true,
        orderId: result.orderId || result.id,
        trackingUrl: `https://track.shipday.com/live/${orderData.orderNumber}`,
        rawResponse: result
      };
    } catch (err) {
      console.error('[ShipdayService] Dispatch Error:', err);
      return {
        success: false,
        error: err.message,
        fallbackTrackingUrl: `https://track.shipday.com/live/${orderData.orderNumber.toLowerCase()}`
      };
    }
  }

  formatOrderPayload(order) {
    const today = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });

    return {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerAddress: `${order.customerAddress}, อ.หว้านใหญ่, จ.มุกดาหาร, 49150`,
      customerPhoneNumber: order.customerPhone,
      customerEmail: order.customerEmail || 'customer@wanondelivery.com',
      restaurantName: order.restaurantName,
      restaurantAddress: `${order.restaurantAddress || 'ตลาดสดเทศบาลหว้านใหญ่'}, อ.หว้านใหญ่, จ.มุกดาหาร, 49150`,
      restaurantPhoneNumber: order.restaurantPhone || '0891112233',
      orderItem: order.items.map(item => ({
        name: `${item.name} (${item.portion}${item.spice ? ', เผ็ด:' + item.spice : ''})`,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        instruction: item.notes || ''
      })),
      orderTotal: order.grandTotal,
      tax: 0,
      deliveryFee: order.deliveryFee,
      tips: order.tips || 0,
      paymentMethod: order.paymentMethod || 'PROMPTPAY',
      deliveryInstruction: order.customerNotes || 'ส่งถึงหน้าบ้านในอำเภอหว้านใหญ่',
      expectedDeliveryDate: today,
      expectedDeliveryTime: nowTime
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ShipdayService;
}
