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

router.patch("/purchases/:id", authMiddleware, async (req, res) => {
  try {
    const id = req.params?.id;
    const slipUrl = req.body?.slipUrl;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ ok: false, error: "ต้องมีรหัสรายการ" });
    }
    const purchase = await heartPurchaseService.attachSlip(
      req.userId,
      id,
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
    if (e.code === "NOT_FOUND") {
      return res.status(404).json({ ok: false, error: e.message });
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

/**
 * สร้างรหัสแจกหัวใจแดงห้องเกม — หักหัวใจแดงจากเจ้าของทันที
 * ต้นทุน = จำนวนรหัส × แดงต่อครั้ง × ครั้งต่อรหัส (หลายรหัส = ครั้งต่อรหัสเสมอ 1)
 */
router.post("/room-red-codes", authMiddleware, async (req, res) => {
  try {
    const redAmount = Math.max(1, Math.floor(Number(req.body?.redAmount) || 0));
    const codeCount = Math.min(
      100,
      Math.max(1, Math.floor(Number(req.body?.codeCount ?? req.body?.quantity) || 1))
    );
    const maxUsesSingle = Math.max(1, Math.floor(Number(req.body?.maxUses) || 1));
    const expiresAt =
      req.body?.expiresAt != null && String(req.body.expiresAt).trim()
        ? String(req.body.expiresAt).trim()
        : null;

    const maxUses = codeCount > 1 ? 1 : maxUsesSingle;
    const result = await roomRedGiftService.issueRoomRedGiftCodes(req.userId, {
      redAmount,
      codeCount,
      maxUses,
      expiresAt
    });
    return res.json({ ok: true, ...result });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.status(503).json({
        ok: false,
        error: "ฟีเจอร์รหัสห้องต้องใช้ฐานข้อมูล PostgreSQL"
      });
    }
    if (e.code === "INSUFFICIENT_REDS") {
      return res.status(400).json({
        ok: false,
        error: e.message,
        code: e.code
      });
    }
    if (e.code === "VALIDATION") {
      return res.status(400).json({ ok: false, error: e.message });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** เจ้าของลบรหัสที่สร้าง — คืนหัวใจแดงส่วนที่ยังไม่ถูกแลก */
router.delete("/room-red-codes/:id", authMiddleware, async (req, res) => {
  try {
    const out = await roomRedGiftService.deleteCodeByCreator(
      req.userId,
      req.params.id
    );
    return res.json({ ok: true, ...out });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.status(503).json({
        ok: false,
        error: "ฟีเจอร์รหัสห้องต้องใช้ฐานข้อมูล PostgreSQL"
      });
    }
    if (e.code === "NOT_FOUND") {
      return res.status(404).json({ ok: false, error: e.message });
    }
    if (e.code === "FORBIDDEN") {
      return res.status(403).json({ ok: false, error: e.message });
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

/**
 * รายละเอียดรหัสแจกหลายรหัส (รหัส + ผู้แลก) — query ids=uuid,uuid
 * ใช้กับประวัติ ledger ที่มี meta.codeIds
 */
router.get("/room-red-codes/batch-detail", authMiddleware, async (req, res) => {
  try {
    const raw = req.query?.ids != null ? String(req.query.ids) : "";
    const parts = raw
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const codes = await roomRedGiftService.getCodesBatchDetailForCreator(
      req.userId,
      parts
    );
    return res.json({ ok: true, codes });
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
    if (e.code === "FORBIDDEN") {
      return res.status(403).json({ ok: false, error: e.message });
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
    let creatorUsername = null;
    if (result.creatorId) {
      const cr = await userService.findById(result.creatorId);
      creatorUsername =
        cr && cr.username ? String(cr.username).toLowerCase() : null;
    }
    return res.json({
      ok: true,
      ...result,
      creatorUsername,
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
      e.code === "CANCELED" ||
      e.code === "VALIDATION"
    ) {
      return res.status(400).json({ ok: false, error: e.message, code: e.code });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = { router };
