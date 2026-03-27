require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { Storage } = require("@google-cloud/storage");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const BUCKET_NAME = process.env.GCS_BUCKET_NAME;
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const KEYFILE_BASE64 = process.env.GCS_KEYFILE_BASE64;

function getStorageClient() {
  if (KEYFILE_BASE64) {
    const serviceAccount = JSON.parse(
      Buffer.from(KEYFILE_BASE64, "base64").toString("utf8")
    );
    return new Storage({
      projectId: PROJECT_ID || serviceAccount.project_id,
      credentials: serviceAccount
    });
  }

  return new Storage({
    projectId: PROJECT_ID
  });
}

const storage = getStorageClient();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.get("/", (_req, res) => {
  res.json({ ok: true, message: "API is running" });
});

app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!BUCKET_NAME) {
      return res.status(500).json({
        ok: false,
        error: "Missing GCS_BUCKET_NAME env"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: "Please upload file field name: image"
      });
    }

    const bucket = storage.bucket(BUCKET_NAME);
    const ext = req.file.originalname.includes(".")
      ? req.file.originalname.substring(req.file.originalname.lastIndexOf("."))
      : "";
    const fileName = `uploads/${Date.now()}-${crypto
      .randomBytes(6)
      .toString("hex")}${ext}`;
    const file = bucket.file(fileName);

    await file.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
        cacheControl: "public, max-age=31536000"
      },
      resumable: false
    });

    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;

    return res.json({
      ok: true,
      fileName,
      publicUrl
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
