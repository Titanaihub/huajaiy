require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(
  express.static(path.join(__dirname, "public"), {
    maxAge: "1h"
  })
);

const PORT = process.env.PORT || 3000;
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, message: "API is running" });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "API is running" });
});

app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
      return res.status(500).json({
        ok: false,
        error:
          "Missing Cloudinary envs: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: "Please upload file field name: image"
      });
    }

    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        ok: false,
        error: "Only image files are allowed"
      });
    }

    const uploaded = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "uploads",
          resource_type: "image"
        },
        (error, result) => {
          if (error) return reject(error);
          return resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    return res.json({
      ok: true,
      fileName: uploaded.public_id,
      publicUrl: uploaded.secure_url
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
