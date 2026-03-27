# Render + Google Cloud Storage Upload API

Node.js Express API for uploading images to Google Cloud Storage (GCS), deployable on Render.

## 1) Local run

1. Copy `.env.example` to `.env`
2. Fill env values
3. Install and run

```bash
npm install
npm start
```

## 2) API endpoint

- `GET /` health check
- `POST /upload` upload single file with field name `image`

Example with curl:

```bash
curl -X POST http://localhost:3000/upload \
  -F "image=@C:/path/to/your/image.jpg"
```

## 3) Google Cloud setup

1. Create GCS bucket
2. Create service account with role:
   - Storage Object Admin (or restricted custom role)
3. Download JSON key
4. Convert JSON to base64

PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\service-account.json"))
```

5. Put value in `GCS_KEYFILE_BASE64`

## 4) Deploy on Render

1. Push this project to GitHub
2. In Render: New + > Blueprint and connect repo
3. Render reads `render.yaml`
4. Add Environment Variables in Render service:
   - `GOOGLE_CLOUD_PROJECT_ID`
   - `GCS_BUCKET_NAME`
   - `GCS_KEYFILE_BASE64`
5. Deploy

## 5) Notes

- This example uses `file.makePublic()` for simplicity
- For production, prefer signed URLs and stricter IAM
