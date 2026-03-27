# Render + Cloudinary Upload API

Node.js Express API for uploading images to Cloudinary, deployable on Render.

## Frontend (Next.js)

Folder `web/` — deploy on Render as a second Web Service (root directory `web`).

| Route | Purpose |
|-------|---------|
| `/` | Home + image upload (no login required) |
| `/shop` | Shop placeholder |
| `/game` | Game placeholder |
| `/auth` | Optional Facebook/LINE login (NextAuth) |
| `/privacy`, `/terms`, `/data-deletion` | Legal pages for Meta etc. |

API service (`server.js`): `POST /upload` to Cloudinary at `api.*` or same host.

## 1) Local run

1. Copy `.env.example` to `.env`
2. Fill env values
3. Install and run

```bash
npm install
npm start
```

## 2) API endpoint

- `GET /` lightweight upload web page
- `GET /health` health check
- `GET /api/health` health check
- `POST /upload` upload single file with field name `image`

Example with curl:

```bash
curl -X POST http://localhost:3000/upload \
  -F "image=@C:/path/to/your/image.jpg"
```

Open lightweight web uploader:

```bash
http://localhost:3000/
```

## 3) Cloudinary setup

1. Sign up / login to Cloudinary
2. Open Dashboard and copy:
   - `Cloud name`
   - `API Key`
   - `API Secret`

## 4) Deploy on Render

1. Push this project to GitHub
2. In Render: New + > Blueprint and connect repo
3. Render reads `render.yaml`
4. Add Environment Variables in Render service:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
5. Deploy

## 5) Notes

- This example uploads to the `uploads` folder in Cloudinary
- For production, validate file types and use stricter upload presets
