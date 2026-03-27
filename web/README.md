# HUAJAIY Web (Next.js + Tailwind)

Lightweight frontend for mobile usage (LINE / Facebook in-app browser).

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

## Deploy on Vercel

1. Import this repo in Vercel
2. Set Root Directory to `web`
3. Add env `NEXT_PUBLIC_API_BASE_URL=https://api.huajaiy.com`
4. Deploy
