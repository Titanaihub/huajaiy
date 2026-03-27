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
