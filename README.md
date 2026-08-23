# WANGO Delivery

เว็บสั่งอาหารสำหรับอำเภอหว้านใหญ่ พร้อม backend สำหรับส่งออเดอร์เข้า Shipday, ติดตามไรเดอร์ และสร้าง QR พร้อมเพย์ตามยอดจริง

## สิ่งที่ต้องตั้งค่าก่อน deploy

สร้าง Environment Variables ในหน้า deploy ดังนี้:

| ชื่อ | จำเป็น | ตัวอย่าง/คำอธิบาย |
|---|---:|---|
| `SHIPDAY_API_KEY` | ใช่ | API key ชุดใหม่จาก Shipday Dashboard |
| `PROMPTPAY_ID` | ใช่สำหรับ QR | เบอร์โทรหรือเลขประจำตัวที่ผูกพร้อมเพย์ เช่น `0812345678` |
| `DELIVERY_BASE_FEE` | ไม่ | ค่าจัดส่งเริ่มต้น ค่าเริ่มต้น `20` บาท |
| `DELIVERY_FREE_KM` | ไม่ | ระยะทางที่ไม่คิดเพิ่ม ค่าเริ่มต้น `3` กม. |
| `DELIVERY_PER_KM` | ไม่ | ราคาต่อกิโลเมตรส่วนเกิน ค่าเริ่มต้น `5` บาท |
| `WEBHOOK_TOKEN` | แนะนำ | สุ่มข้อความยาวเพื่อป้องกัน webhook ปลอม |
| `DATA_FILE` | ไม่ | ตำแหน่งเก็บสถานะออเดอร์ เช่น `/data/orders.json` เมื่อผูก persistent volume |

ห้ามอัปโหลดไฟล์ `.env` ขึ้น Git และห้ามใส่ Shipday API key ใน `index.html`

## ทดสอบในเครื่อง

ต้องใช้ Node.js 20 ขึ้นไป

```bash
npm install
copy .env.example .env
npm start
```

จากนั้นเปิด `http://localhost:4000` และตรวจสุขภาพระบบที่ `http://localhost:4000/api/health`

## วิธี deploy

โปรเจกต์นี้เป็น Node.js web service ชุดเดียว:

- Build command: `npm install`
- Start command: `npm start`
- Port: ระบบอ่านจากตัวแปร `PORT` อัตโนมัติ
- Health check: `/api/health`

หากแพลตฟอร์มรองรับ persistent volume ให้ mount volume แล้วตั้ง `DATA_FILE=/data/orders.json` เพื่อเก็บสถานะการจ่ายเงินเมื่อแอป restart หากไม่มี volume ออเดอร์ใน Shipday ยังอยู่ แต่สถานะภายในเว็บบางส่วนอาจหายหลัง restart

## การตั้งค่าภายนอก

### Shipday

1. สร้าง API key ชุดใหม่ เนื่องจาก key เดิมเคยอยู่ใน source code
2. ใส่ key ใหม่เป็น `SHIPDAY_API_KEY` บนระบบ deploy
3. หากใช้ webhook ให้ตั้ง URL เป็น `https://YOUR-DOMAIN/api/shipday-webhook?token=YOUR_WEBHOOK_TOKEN`

หน้าเว็บยัง polling สถานะทุก 4 วินาที ดังนั้นระบบทำงานได้แม้ยังไม่ได้ตั้ง webhook

### Google Sign-In

เพิ่มโดเมนจริงใน Google Cloud Console > OAuth Client > Authorized JavaScript origins เช่น `https://YOUR-DOMAIN` ไม่เช่นนั้น Google Sign-In จะถูกปฏิเสธบนโดเมนใหม่

### PromptPay

QR ที่แสดงเป็น QR มาตรฐานและผูกยอดออเดอร์จริง แต่ปุ่ม “ฉันสแกนชำระแล้ว” เป็นการยืนยันจากลูกค้า ไม่ใช่การตรวจรายการเดินบัญชีอัตโนมัติ หากต้องการยืนยันยอดอัตโนมัติจำเป็นต้องเชื่อม payment gateway หรือ API จากผู้ให้บริการรับชำระเงินเพิ่มเติม

## เส้นทาง API

- `POST /api/orders` — ตรวจข้อมูลและส่งออเดอร์เข้า Shipday
- `GET /api/orders/:orderNumber` — อ่านสถานะล่าสุดจาก Shipday
- `POST /api/orders/:orderNumber/pay` — บันทึก PromptPay หรือ COD
- `GET /api/orders/:orderNumber/promptpay-qr` — สร้าง QR ตามยอดออเดอร์
- `POST /api/shipday-webhook` — รับการเปลี่ยนแปลงจาก Shipday
- `GET /api/health` — ตรวจว่าตั้งค่า Shipday/PromptPay แล้วหรือยัง
