# HUAJAIY — API (Express) + เว็บ (Next.js)

อัปโหลดรูปผ่าน Cloudinary, ร้านค้า/ตะกร้า/เกม/ติดต่อ — deploy บน **Render** ได้โดย **push GitHub แล้วสร้างบริการบนคลาวด์** ไม่จำเป็นต้องรัน npm บนเครื่องตัวเอง

---

## Deploy ทดสอบบน Render (แนะนำ — ไม่ต้องจำลองในเครื่อง)

1. **Push โค้ดขึ้น GitHub** (repo ว่างหรือมีอยู่แล้ว)
2. เข้า [Render](https://dashboard.render.com) → **New +** → **Blueprint**
3. เชื่อม repository → Render อ่าน **`render.yaml`** จะได้ **2 Web Services**:
   - **`huajaiy-api`** — API ที่รากโปรเจกต์ (`server.js`)
   - **`huajaiy-web`** — Next.js โฟลเดอร์ **`web/`**
4. ในหน้าตั้งค่า Blueprint / แต่ละ service ให้กรอก **Environment** (ตัวที่ `sync: false`):
   - **API (`huajaiy-api`)**  
     - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`  
     - `JWT_SECRET` — อย่างน้อย 16 ตัว (สำหรับสมาชิกสมัคร/ล็อกอิน)  
     - **`DATABASE_URL`** — จาก PostgreSQL บน Render (แนะนำ production) — ถ้าไม่ใส่ สมาชิกใช้ไฟล์ `data/users.json` และออเดอร์บน DB จะไม่ทำงาน  
     - (ไม่บังคับ) `GAME_HEART_COST` — ถ้าตั้ง ต้องมีหัวใจพอในเบราว์เซอร์ก่อนเล่นเกม API
5. **Deploy** ให้ API ขึ้นก่อน → คัดลอก **URL สาธารณะ** ของ API (เช่น `https://huajaiy-api.onrender.com`)
6. เปิด service **`huajaiy-web`** → **Environment** → ตั้ง  
   **`NEXT_PUBLIC_API_BASE_URL`** = URL API ข้อ 5 (ไม่มี `/` ท้าย, มี `https://`)
7. ที่เว็บ: **Manual Deploy** → **Clear build cache & deploy** (สำคัญ — ให้ Next อ่านค่า public env ตอน build)
8. เปิด URL ของ **`huajaiy-web`** ในเบราว์เซอร์ — ทดสอบอัปโหลด / เกม / ติดต่อ

**ถ้าใช้หน้า `/auth`:** ตั้ง `NEXTAUTH_URL` = URL เว็บจริงของ `huajaiy-web`, `NEXTAUTH_SECRET` = สตริงสุ่มยาว ๆ และตั้งค่า OAuth ตาม `web/.env.example`

---

## Frontend (Next.js)

โฟลเดอร์ `web/` — บน Render ตั้ง **Root Directory** = `web` (Blueprint จัดให้แล้ว)

| Route | Purpose |
|-------|---------|
| `/` | Home + image upload (no login required) |
| `/shop` | Demo product grid (mock data) |
| `/shop/[id]` | Product detail (static params from mock) |
| `/cart` | Demo cart + mock checkout (hearts grant) |
| `/orders` | ประวัติในเครื่อง + ออเดอร์จาก PostgreSQL (เมื่อล็อกอินและมี `DATABASE_URL`) |
| `/game` | Flip-card demo (12 tiles, collect-first win) |
| `/register` | สมัครสมาชิก (ชื่อ–นามสกุลไทย, เบอร์, ยูสเซอร์, รหัสผ่าน) |
| `/login` | เข้าสู่ระบบสมาชิก |
| `/auth` | Facebook/LINE (NextAuth — ขั้นตอนหลัง) |
| `/contact` | Contact form (stored in server logs via `POST /api/inquiry`) |
| `/privacy`, `/terms`, `/data-deletion` | Legal pages for Meta etc. |

API service (`server.js`): `POST /upload` to Cloudinary · สมาชิกเก็บที่ `data/users.json` บนเซิร์ฟเวอร์ (ไม่ commit)

**สมาชิก:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` (Authorization: Bearer …)

เกม (สุ่มกระดานฝั่งเซิร์ฟเวอร์): `GET/POST /api/game/*` — ฝั่ง Next rewrite `/api/game/*` ไปที่ `NEXT_PUBLIC_API_BASE_URL`

---

## (ทางเลือก) รันในเครื่องสำหรับพัฒนา

1. คัดลอก `.env.example` → `.env` (API) และ `web/.env.example` → `web/.env.local`
2. `npm install` ที่รากแล้ว `npm start` (API)
3. ใน `web/`: `npm install` แล้ว `npm run dev` — ตั้ง `NEXT_PUBLIC_API_BASE_URL` ชี้ API

---

## API endpoints (Express)

- `GET /` lightweight upload web page
- `GET /health`, `GET /api/health`
- `POST /upload` field `image`
- `POST /api/auth/register` — สมัครสมาชิก (body JSON)
- `POST /api/auth/login`
- `GET /api/auth/me` — ต้องมี header `Authorization: Bearer <token>`
- `POST /api/orders` — บันทึกออเดอร์ (Bearer + body JSON)
- `GET /api/orders/me` — รายการออเดอร์ของผู้ใช้ (Bearer)
- `GET /api/game/meta`
- `POST /api/game/start`, `POST /api/game/flip`, `POST /api/game/abandon`

---

## Cloudinary

1. สมัคร / เข้า Cloudinary Dashboard  
2. คัดลอก Cloud name, API Key, API Secret → ใส่ใน env ของ **`huajaiy-api`** บน Render

---

## หมายเหตุ

- อัปโหลดไปโฟลเดอร์ `uploads` ใน Cloudinary — production ควรจำกัดประเภทไฟล์และ preset เพิ่มเติม
- ข้อความติดต่อจาก `/contact` ปรากฏใน **Logs** ของ service `huajaiy-web` บน Render (ค้นหา `[HUAJAIY inquiry]`)
