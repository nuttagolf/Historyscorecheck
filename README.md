# WASH ME PLS + Shipday

เว็บชุดนี้เพิ่มการสร้างงาน “ไปรับผ้าจากบ้านลูกค้าแล้วนำมาส่งร้าน” ใน Shipday โดยไม่เปิดเผย API Key ใน GitHub Pages

แนวทาง flow สำหรับระบบใช้งานจริงอยู่ใน `FLOW.md` โดยแนะนำให้ร้านตรวจสอบออเดอร์ก่อนสร้างงานคนขับ

## สิ่งที่เพิ่มแล้ว

- เลือกวิธีส่งผ้าและวิธีรับผ้าสะอาดแยกกัน รองรับครบ 4 รูปแบบ
- ปักหมุดบ้านด้วยตำแหน่งปัจจุบันหรือแตะบนแผนที่
- แบ่งโซน A/B/C ตามระยะ 3/6/10 กม.
- คิดเที่ยวเดียว 30/40/50 บาท และไป–กลับ 49/69/89 บาท
- ส่งพิกัดรับและพิกัดร้านไปกับงานคนขับ
- ปิดช่วงเวลารับผ้าที่ผ่านไปแล้ว และตรวจซ้ำใน Worker ตามเวลาประเทศไทย
- สร้าง QR พร้อมเพย์แบบระบุยอดเงินในหน้าเว็บตามโครงสร้าง Thai QR Payment (EMVCo Merchant-Presented Mode)
- ไม่ส่งเลขพร้อมเพย์หรือยอดชำระไปยังบริการสร้างภาพ QR ภายนอก
- ส่งออเดอร์ผ่าน Cloudflare Worker
- คำนวณราคาใหม่ใน Worker เพื่อป้องกันการแก้ราคาจากหน้าเว็บ
- แปลงเบอร์ไทยเป็นรูปแบบ `+66`
- แปลงเวลาประเทศไทยเป็น UTC ก่อนส่ง Shipday
- แสดงเลขออเดอร์และ Shipday Order ID ในใบสรุป
- จำกัดเว็บไซต์ที่เรียก API ด้วย CORS

## ตั้งค่า 1: ข้อมูลร้าน

เปิด `worker/wrangler.toml` แล้วแก้เฉพาะ:

```toml
STORE_ADDRESS = "ที่อยู่ร้านจริง"
STORE_PHONE = "เบอร์โทรร้าน"
STORE_LATITUDE = "พิกัดละติจูดร้าน"
STORE_LONGITUDE = "พิกัดลองจิจูดร้าน"
```

จากนั้นใส่พิกัดเดียวกันใน `storeLocation` ที่ `config.js` และเปลี่ยน `approximate` เป็น `false`

พิกัดเริ่มต้น `16.71431, 104.75455` เป็นเพียงจุดกึ่งกลางเทศบาลตำบลหว้านใหญ่ ไม่ใช่หมุดร้านจริง ห้ามใช้คิดเงินจริงจนกว่าจะเปลี่ยนเป็นตำแหน่งร้าน

หากเปลี่ยนระยะหรือราคาโซน ต้องแก้ทั้ง `deliveryZones` ใน `config.js` และ `DELIVERY_ZONES` ใน `worker/src/index.js` โดย Worker จะเป็นผู้คำนวณราคาจริงซ้ำอีกครั้ง

## ตั้งค่า 2: Deploy Worker

```powershell
cd worker
npm install
npx wrangler login
npx wrangler secret put SHIPDAY_API_KEY
npx wrangler secret put SLIP2GO_SECRET_KEY
npm run deploy
```

ตอน `secret put` ให้วาง Secret Key ของ Shipday และ Slip2Go ในหน้าต่างคำสั่งโดยตรง คีย์จะไม่ถูกเขียนลงไฟล์ในโค้ด

หลัง deploy จะได้ URL คล้าย:

```text
https://wash-me-pls-shipday.YOUR_SUBDOMAIN.workers.dev
```

## ตั้งค่า 3: ต่อหน้าเว็บเข้ากับ Worker

เปิด `config.js` แล้วเปลี่ยน `apiUrl`:

```js
window.WASH_ME_CONFIG = {
  apiUrl: "https://wash-me-pls-shipday.YOUR_SUBDOMAIN.workers.dev/api/orders",
  promptPayId: "0809614423",
  storeLocation: {
    lat: 16.71431,
    lng: 104.75455,
    label: "WASH ME PLS LAUNDRY",
    approximate: false
  },
  deliveryZones: [
    { key: "A", maxKm: 3, oneWayFee: 30, roundTripFee: 49 },
    { key: "B", maxKm: 6, oneWayFee: 40, roundTripFee: 69 },
    { key: "C", maxKm: 10, oneWayFee: 50, roundTripFee: 89 }
  ]
};
```

จากนั้นอัปโหลด `index.html`, `config.js`, `thai-qr.js` และ `logo.png` ไปยัง GitHub Pages หรือเว็บโฮสติ้งของคุณ

## ตรวจสุขภาพระบบ

เปิด URL นี้หลัง deploy:

```text
https://wash-me-pls-shipday.YOUR_SUBDOMAIN.workers.dev/health
```

ถ้าตั้งค่าครบจะเห็น `"shipdayConfigured": true` และ `"slip2goConfigured": true`

## ลำดับการทำงาน (Payment & Dispatch Flow)

1. ลูกค้าเลือกบริการ (ซัก 60฿ / อบ 60฿ / ซัก+อบ 120฿ ต่อตะกร้า) และส่งคำขอ
2. Backend สร้างออเดอร์สถานะ `รอชำระเงิน` และสร้าง QR พร้อมเพย์ผ่าน Slip2Go API
3. ลูกค้าสแกนชำระเงินและอัปโหลดรูปสลิป
4. Backend ตรวจสอบสลิปผ่าน Slip2Go (ยอดเงิน, บัญชีผู้รับ, ตรวจสลิปซ้ำ)
5. เมื่อยืนยันยอดเงินสำเร็จ เปลี่ยนสถานะเป็น `ชำระเงินแล้ว` และส่งงานรับผ้าไปยัง Shipday อัตโนมัติ (เฉพาะออเดอร์ที่เลือกให้คนขับไปรับ)
6. หาก Shipday ไม่พร้อม ระบบเก็บออเดอร์ที่ชำระแล้วและลองส่งใหม่ทุก 5 นาที ไม่ทำให้ออเดอร์หาย
7. งานส่งผ้าคืนจะถูกสร้างเมื่อร้านกด “ผ้าเสร็จ” และกำหนดวัน/เวลาแล้วเท่านั้น

## หน้าหลังร้าน

เปิด `admin.html` แล้วใส่ Admin Token เพื่อดูออเดอร์ เปลี่ยนสถานะ ลองส่ง Shipday ใหม่ และสร้างงานส่งผ้าคืน

Admin Token ต้องเก็บเป็น Cloudflare Secret เท่านั้น:

```powershell
cd worker
npx wrangler secret put ADMIN_TOKEN
```

ห้ามใส่ Token นี้ใน `config.js`, GitHub Pages หรือส่งต่อให้ลูกค้า

## เช็กลิสต์ก่อนเปิดใช้จริง

1. เปลี่ยน Shipday API Key ที่เคยเปิดเผย แล้วตั้งค่า `SHIPDAY_API_KEY` ใหม่ใน Cloudflare
2. ตั้ง `ADMIN_TOKEN` เป็นค่าที่ยาวและเดายาก
3. ตรวจ `SLIP2GO_SECRET_KEY` และบัญชีผู้รับเงิน `SLIP2GO_RECEIVER_ACCOUNT`
4. นำโครงสร้างฐานข้อมูลขึ้นระบบจริง:

```powershell
cd worker
npx wrangler d1 migrations apply wash-me-db --remote
```

5. Deploy Worker ด้วย `npm run deploy`
6. อัปโหลด `index.html`, `admin.html`, `config.js`, `thai-qr.js`, `logo.png`, `leaflet.css` และ `leaflet.js` ไป GitHub Pages
7. ทดสอบ LINE Login บน URL จริง และลองจ่ายเงินจริงยอดต่ำ 1 ออเดอร์
8. ตรวจว่าออเดอร์ปรากฏในหน้าหลังร้าน งานรับผ้าเข้า Shipday และงานส่งคืนถูกสร้างหลังร้านกด “ผ้าเสร็จ”

ระบบจะจำกัดจำนวนออเดอร์ต่อช่วงเวลา ตรวจเวลาย้อนหลัง ป้องกันส่งคำขอซ้ำ จำกัดการเรียก API และล้างข้อมูลเก่าตามอายุที่กำหนด
