# โครงสร้างระบบ HUAJAIY (ภาพรวม)

```
[ผู้ใช้] → Next.js (web/) — หน้าเว็บ, rewrite /api/game/* → API
                ↓
         Cloudinary (รูป), localStorage (หัวใจ/ตะกร้าสาธิต)

[ผู้ใช้] → Express API (server.js) — อัปโหลด, เกม session (RAM), สมาชิก, ออเดอร์
                ↓
         PostgreSQL เมื่อมี DATABASE_URL
         หรือ data/users.json เมื่อไม่มี DB (สมาชิกอย่างเดียว)
```

## ชั้นข้อมูล

| ส่วน | ที่เก็บ | หมายเหตุ |
|------|---------|----------|
| สมาชิก | ตาราง `users` (PG) หรือ `data/users.json` | รหัสผ่าน bcrypt |
| ออเดอร์สาธิต (ล็อกอิน) | ตาราง `orders` | ต้องมี PG |
| ร้านค้า (โครงอนาคต) | ตาราง `shops` | ยังไม่มี UI ผูก |
| เกมรอบ | Memory + `gameSession.js` | รีสตาร์ทแล้วหาย — ย้าย Redis/DB ภายหลัง |
| หัวใจ / ตะกร้า demo | localStorage เบราว์เซอร์ | ย้ายตาม user ใน DB ภายหลัง |

## API หลัก

- `/api/auth/*` — สมาชิก JWT  
- `/api/orders` POST, `/api/orders/me` GET — ออเดอร์ (ต้องล็อกอิน + PG)  
- `/api/game/*` — เกม  
- `/upload` — Cloudinary  

## Render

- สร้าง **PostgreSQL** ใน Render → คัดลอก **Internal Database URL** → ใส่ใน env **`DATABASE_URL`** ของ service **huajaiy-api**  
-  redeploy API หลังตั้งค่า — ตารางสร้างอัตโนมัติตอน start (`db/init.js`)
