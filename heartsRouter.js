const express = require("express");
const { authMiddleware } = require("./authRouter");
const heartPackageService = require("./services/heartPackageService");
const heartPurchaseService = require("./services/heartPurchaseService");

const router = express.Router();

router.get("/packages", async (_req, res) => {
  try {
    const packages = await heartPackageService.listActive();
    return res.json({ ok: true, packages });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.status(503).json({
        ok: false,
        error:
          "ระบบซื้อหัวใจต้องใช้ PostgreSQL — ตั้ง DATABASE_URL ที่ API"
      });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.post("/purchases", authMiddleware, async (req, res) => {
  try {
    const packageId = req.body?.packageId;
    const slipUrl = req.body?.slipUrl;
    if (!packageId || typeof packageId !== "string") {
      return res.status(400).json({ ok: false, error: "ต้องมี packageId" });
    }
    const purchase = await heartPurchaseService.createPurchase(
      req.userId,
      packageId,
      slipUrl
    );
    return res.json({ ok: true, purchase });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.status(503).json({
        ok: false,
        error:
          "ระบบซื้อหัวใจต้องใช้ PostgreSQL — ตั้ง DATABASE_URL ที่ API"
      });
    }
    if (e.code === "VALIDATION") {
      return res.status(400).json({ ok: false, error: e.message });
    }
    if (e.code === "PENDING_EXISTS" || e.code === "PACKAGE_INVALID") {
      return res.status(400).json({ ok: false, error: e.message });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.get("/purchases/mine", authMiddleware, async (req, res) => {
  try {
    const purchases = await heartPurchaseService.listMine(req.userId);
    return res.json({ ok: true, purchases });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.status(503).json({
        ok: false,
        error:
          "ระบบซื้อหัวใจต้องใช้ PostgreSQL — ตั้ง DATABASE_URL ที่ API"
      });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = { router };
