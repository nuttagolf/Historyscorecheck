window.WASH_ME_CONFIG = {
  // ใส่ URL ที่ได้หลัง deploy Cloudflare Worker เช่น
  // https://wash-me-shipday.your-account.workers.dev/api/orders
  apiUrl: "https://wash-me-pls-shipday.nuttagolf6106.workers.dev/api/orders",

  // เลขพร้อมเพย์ร้าน: เบอร์มือถือ 10 หลัก เลขบัตร/เลขภาษี 13 หลัก หรือ e-Wallet 15 หลัก
  promptPayId: "0809614423",

  // พิกัดร้าน
  storeLocation: {
    lat: 16.72846036353849,
    lng: 104.74091764129902,
    label: "WASH ME PLS LAUNDRY",
    approximate: false
  },

  // ระยะเป็นเส้นตรงจากหมุดร้านถึงหมุดลูกค้า
  deliveryZones: [
    { key: "A", maxKm: 3, oneWayFee: 30, roundTripFee: 49 },
    { key: "B", maxKm: 6, oneWayFee: 40, roundTripFee: 69 },
    { key: "C", maxKm: 10, oneWayFee: 50, roundTripFee: 89 }
  ]
};
