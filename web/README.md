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

## Deploy on Render (recommended for this project)

1. New + > Web Service
2. Select this repo
3. Set Root Directory to `web`
4. Build Command: `npm install && npm run build`
5. Start Command: `npm run start`
6. Add env `NEXT_PUBLIC_API_BASE_URL=https://api.huajaiy.com`
7. Deploy
