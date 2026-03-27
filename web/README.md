# HUAJAIY Web (Next.js + Tailwind)

Lightweight frontend for mobile usage (LINE / Facebook in-app browser).
The uploader compresses images on client side before upload for faster mobile performance.

## Run locally

1. Copy `.env.example` to `.env.local`
2. Install dependencies
3. Run dev server

```bash
npm install
npm run dev
```

Open `http://localhost:3000`

## Environment

- `NEXT_PUBLIC_API_BASE_URL` example: `https://api.huajaiy.com`
- `NEXTAUTH_URL` ต้องตรง URL จริงที่ผู้ใช้เข้า (มี `https://`) เช่น `https://huajaiy-web.onrender.com`
- `NEXTAUTH_SECRET` สตริงสุ่มยาวอย่างน้อย 32 ตัว
- `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` จาก Meta Developer
- `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET` จาก LINE Developers (ช่องทาง LINE Login)

### Callback URL ที่ต้องใส่ในคอนโซลผู้ให้บริการ

แทน `https://YOUR_DOMAIN` ด้วยโดเมนจริงของเว็บ (เช่น `https://huajaiy-web.onrender.com`)

- Facebook: `https://YOUR_DOMAIN/api/auth/callback/facebook`
- LINE: `https://YOUR_DOMAIN/api/auth/callback/line`

### TikTok

TikTok Login Kit ใช้รูปแบบ OAuth ที่ต้องตั้งค่าแยกตามเอกสาร — ปุ่มบนหน้าเว็บเป็น “เร็วๆ นี้” จนกว่าจะผูก provider ในรอบถัดไป

## Deploy on Render (recommended for this project)

1. New + > Web Service
2. Select this repo
3. Set Root Directory to `web`
4. Build Command: `npm install && npm run build`
5. Start Command: `npm run start`
6. Add environment variables (อย่างน้อย):
   - `NEXT_PUBLIC_API_BASE_URL=https://api.huajaiy.com`
   - `NEXTAUTH_URL=https://<your-web-service>.onrender.com`
   - `NEXTAUTH_SECRET=<random-long-string>`
   - ค่า Facebook และ/หรือ LINE ตามที่เปิดใช้
7. Deploy

---

## ขั้นตอนที่แนะนำ (ทำตามลำดับนี้)

ใช้โดเมนเว็บจริงของคุณแทน `https://YOUR-WEB.onrender.com` (เช่น `https://huajaiy-web.onrender.com`)

### A) Render — service เว็บ Next.js (`huajaiy-web`)

1. เปิด service → **Environment**
2. เพิ่ม/ตรวจค่า:
   - `NEXTAUTH_URL` = URL หน้าเว็บนี้เป๊ะๆ (มี `https://` ไม่มี slash ท้าย)
   - `NEXTAUTH_SECRET` = สตริงสุ่มยาวๆ
   - `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` (ถ้าใช้ Facebook)
   - `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET` (ถ้าใช้ LINE — จากช่อง **LINE Login**)
3. กด **Save** แล้ว **Manual Deploy → Deploy latest commit**

### B) Meta (Facebook) — ถ้าใช้ปุ่ม Facebook

1. [developers.facebook.com](https://developers.facebook.com/) → แอปของคุณ → **Facebook Login** → **Settings**
2. **Valid OAuth Redirect URIs** ใส่:
   - `https://YOUR-WEB.onrender.com/api/auth/callback/facebook`
3. บันทึก

### C) LINE Developers — ถ้าใช้ปุ่ม LINE

1. [developers.line.biz](https://developers.line.biz/) → เลือก Provider → ช่องทาง **LINE Login**
2. แท็บ **LINE Login** → ตั้ง **Callback URL**:
   - `https://YOUR-WEB.onrender.com/api/auth/callback/line`
3. คัดลอก **Channel ID** = `LINE_CHANNEL_ID`, **Channel secret** = `LINE_CHANNEL_SECRET` ไปใส่ใน Render

### D) ทดสอบ

1. เปิด `https://YOUR-WEB.onrender.com`
2. กด Facebook หรือ LINE → ยอมรับสิทธิ์ครั้งแรก
3. เลือกรูป → อัปโหลด

ถ้าล็อกอินไม่ขึ้น ให้ดูข้อความแดงใต้ปุ่ม และย้อนกลับไปเช็ก Callback URL กับค่าใน Render ให้ตรงโดเมนเดียวกัน
