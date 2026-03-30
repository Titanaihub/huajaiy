const express = require("express");
const { authMiddleware } = require("./authRouter");
const heartPackageService = require("./services/heartPackageService");
const heartPurchaseService = require("./services/heartPurchaseService");
const roomRedGiftService = require("./services/roomRedGiftService");
const userService = require("./services/userService");

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
          "การซื้อหัวใจชั่วคราวไม่พร้อมใช้งาน — ลองใหม่ภายหลังหรือติดต่อผู้ดูแลเว็บไซต์"
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
          "การซื้อหัวใจชั่วคราวไม่พร้อมใช้งาน — ลองใหม่ภายหลังหรือติดต่อผู้ดูแลเว็บไซต์"
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
          "การซื้อหัวใจชั่วคราวไม่พร้อมใช้งาน — ลองใหม่ภายหลังหรือติดต่อผู้ดูแลเว็บไซต์"
      });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** สร้างรหัสแจกหัวใจแดงห้องเกม (เจ้าของห้อง) */
router.post("/room-red-codes", authMiddleware, async (req, res) => {
  try {
    const redAmount = Math.max(1, Math.floor(Number(req.body?.redAmount) || 0));
    const maxUses = Math.max(1, Math.floor(Number(req.body?.maxUses) || 1));
    const expiresAt =
      req.body?.expiresAt != null && String(req.body.expiresAt).trim()
        ? String(req.body.expiresAt).trim()
        : null;
    const row = await roomRedGiftService.createCode(req.userId, {
      redAmount,
      maxUses,
      expiresAt
    });
    return res.json({ ok: true, code: row });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.status(503).json({
        ok: false,
        error: "ฟีเจอร์รหัสห้องต้องใช้ฐานข้อมูล PostgreSQL"
      });
    }
    if (e.code === "VALIDATION") {
      return res.status(400).json({ ok: false, error: e.message });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.get("/room-red-codes/mine", authMiddleware, async (req, res) => {
  try {
    const codes = await roomRedGiftService.listCodesForCreator(req.userId);
    return res.json({ ok: true, codes });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.status(503).json({
        ok: false,
        error: "ฟีเจอร์รหัสห้องต้องใช้ฐานข้อมูล PostgreSQL"
      });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** แลกรหัสที่เจ้าของห้องออกให้ — หัวใจแดงใช้ได้เฉพาะห้องเจ้าของหรือเกมที่เปิดอนุญาต */
router.post("/room-red-redeem", authMiddleware, async (req, res) => {
  try {
    const raw = req.body?.code;
    const result = await roomRedGiftService.redeemCode(req.userId, raw);
    const user = await userService.findById(req.userId);
    const roomGiftRed = await roomRedGiftService.listRoomGiftBalancesForUser(
      req.userId
    );
    return res.json({
      ok: true,
      ...result,
      user: user ? { ...userService.publicUser(user), roomGiftRed } : null
    });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.status(503).json({
        ok: false,
        error: "การแลกรหัสต้องใช้ฐานข้อมูล PostgreSQL"
      });
    }
    if (
      e.code === "NOT_FOUND" ||
      e.code === "EXPIRED" ||
      e.code === "EXHAUSTED" ||
      e.code === "VALIDATION"
    ) {
      return res.status(400).json({ ok: false, error: e.message, code: e.code });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = { router };
