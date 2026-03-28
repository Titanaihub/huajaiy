require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const path = require("path");
const {
  PRIZES,
  CARD_COUNT,
  createSession,
  flip: flipGame,
  abandonSession
} = require("./gameSession");
const { router: authRouter } = require("./authRouter");
const { router: ordersRouter } = require("./ordersRouter");
const { router: adminRouter } = require("./adminRouter");
const { router: ownerRouter } = require("./ownerRouter");
const { router: heartsRouter } = require("./heartsRouter");
const { initDb } = require("./db/init");
const { promoteAdminFromEnv } = require("./services/promoteAdminFromEnv");
const { bootstrapAdminFromEnv } = require("./services/bootstrapAdminFromEnv");
const centralGameService = require("./services/centralGameService");
const centralGameSession = require("./centralGameSession");

const app = express();
app.set("trust proxy", 1);
app.use(
  cors({
    origin: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/admin", adminRouter);
app.use("/api/owner", ownerRouter);
app.use("/api/hearts", heartsRouter);
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

/** ข้อมูลกติกาเกมโดยไม่สร้าง session — ให้ฝั่งเว็บเช็กหัวใจก่อนเรียก start */
async function getActiveCentralSnapshot() {
  try {
    return await centralGameService.getActiveGameSnapshot();
  } catch (e) {
    if (e.code === "DB_REQUIRED") return null;
    throw e;
  }
}

function centralMetaFromSnap(snap) {
  const pink = snap.game.pinkHeartCost ?? 0;
  const red = snap.game.redHeartCost ?? 0;
  return {
    gameMode: "central",
    gameId: snap.game.id,
    title: snap.game.title,
    pinkHeartCost: pink,
    redHeartCost: red,
    heartCost: pink + red,
    cardCount: snap.game.tileCount,
    setCount: snap.game.setCount,
    imagesPerSet: snap.game.imagesPerSet,
    setImageCounts: snap.game.setImageCounts,
    prizes: centralGameService.prizesForClient(snap.rules, snap.game.setImageCounts)
  };
}

app.get("/api/game/meta", async (_req, res) => {
  try {
    const snap = await getActiveCentralSnapshot();
    if (snap) {
      return res.json({ ok: true, ...centralMetaFromSnap(snap) });
    }
    const heartCost = Number(process.env.GAME_HEART_COST || 0);
    return res.json({
      ok: true,
      gameMode: "legacy",
      heartCost,
      cardCount: CARD_COUNT,
      prizes: PRIZES
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** เริ่มรอบเกม — ถ้ามีเกมส่วนกลาง active ใช้ central ไม่งั้น legacy */
app.post("/api/game/start", async (_req, res) => {
  try {
    const snap = await getActiveCentralSnapshot();
    if (snap) {
      const sessionId = centralGameSession.createSession(snap);
      return res.json({
        ok: true,
        sessionId,
        ...centralMetaFromSnap(snap)
      });
    }
    const heartCost = Number(process.env.GAME_HEART_COST || 0);
    const sessionId = createSession();
    return res.json({
      ok: true,
      gameMode: "legacy",
      sessionId,
      cardCount: CARD_COUNT,
      prizes: PRIZES,
      heartCost
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** เปิดป้าย — ลอง central ก่อนเมื่อมีเกมส่วนกลาง active */
app.post("/api/game/flip", async (req, res) => {
  try {
    const { sessionId, index } = req.body || {};
    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ ok: false, error: "ต้องมี sessionId" });
    }
    const idx = Number(index);
    const snap = await getActiveCentralSnapshot();
    if (snap) {
      const r = centralGameSession.flip(sessionId, idx);
      if (r.ok) return res.json(r);
      if (r.error !== "ไม่พบรอบเกม หรือหมดอายุ") {
        return res.status(400).json(r);
      }
    }
    const result = flipGame(sessionId, idx);
    if (!result.ok) {
      return res.status(400).json(result);
    }
    return res.json({ ...result, gameMode: "legacy" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/api/game/abandon", async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ ok: false, error: "ต้องมี sessionId" });
    }
    const snap = await getActiveCentralSnapshot();
    if (snap && centralGameSession.abandonSession(sessionId)) {
      return res.json({ ok: true, removed: true });
    }
    const removed = abandonSession(sessionId);
    return res.json({ ok: true, removed });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
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

async function start() {
  try {
    await initDb();
    try {
      await bootstrapAdminFromEnv();
      await promoteAdminFromEnv();
    } catch (e) {
      console.error("[admin] bootstrap/promote:", e.message);
    }
  } catch (e) {
    console.error("[db] init failed:", e.message);
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });
}

start();
