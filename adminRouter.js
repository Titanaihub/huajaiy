const express = require("express");
const bcrypt = require("bcryptjs");
const { authMiddleware, requireRole } = require("./authRouter");
const { validatePassword } = require("./authValidators");
const userService = require("./services/userService");
const nameChangeRequestService = require("./services/nameChangeRequestService");
const orderService = require("./services/orderService");
const shopService = require("./services/shopService");
const { getAdminSnapshot } = require("./gameSession");
const { getAdminSnapshotCentral } = require("./centralGameSession");
const centralGameService = require("./services/centralGameService");
const heartPackageService = require("./services/heartPackageService");
const heartPurchaseService = require("./services/heartPurchaseService");

const router = express.Router();

function isUuidParam(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(id || "")
  );
}

/** ตรวจว่าโทเค็นเป็นบทบาทแอดมิน — ใช้ทดสอบหลังตั้ง role ในฐานข้อมูล */
router.get("/ping", authMiddleware, requireRole("admin"), (req, res) => {
  res.json({
    ok: true,
    message: "โครงระบบแอดมินทำงาน",
    role: req.userRole
  });
});

/** รายการสมาชิก — ค้นหาได้จากยูสเซอร์ ชื่อ นามสกุล เบอร์ หรือ id */
router.get("/members", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const q = req.query.q != null ? String(req.query.q) : "";
    const limit = req.query.limit != null ? Number(req.query.limit) : 50;
    const offset = req.query.offset != null ? Number(req.query.offset) : 0;
    const result = await userService.listMembers({ q, limit, offset });
    return res.json({ ok: true, ...result });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** สมาชิกหนึ่งคน — ข้อมูลครบสำหรับแอดมิน (ออเดอร์ ร้าน สถิติ) */
router.get(
  "/members/:id/full",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบ id ไม่ถูกต้อง" });
      }
      const u = await userService.findById(id);
      if (!u) {
        return res.status(404).json({ ok: false, error: "ไม่พบสมาชิก" });
      }
      let orders = [];
      let stats = { orderCount: 0, totalHeartsGrantedFromOrders: 0 };
      try {
        orders = await orderService.listOrdersByUserId(id, 100);
        stats.orderCount = orders.length;
        stats.totalHeartsGrantedFromOrders = orders.reduce(
          (s, o) => s + (Number(o.heartsGranted) || 0),
          0
        );
      } catch (e) {
        if (e.code !== "DB_REQUIRED") throw e;
      }
      const shops = await shopService.listByOwner(id);
      const nameChangeRequestPending =
        await nameChangeRequestService.hasPendingForUser(id);
      return res.json({
        ok: true,
        user: userService.adminMemberDetail(u),
        orders,
        shops,
        stats,
        nameChangeRequestPending,
        heartsNote:
          "หัวใจชมพู/แดงอยู่บนเซิร์ฟเวอร์ — ตัวเลขมุมจอ (localStorage) เป็นคนละกระเป๋ากับเกมสาธิต"
      });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.get(
  "/members/:id",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบ id ไม่ถูกต้อง" });
      }
      const u = await userService.findById(id);
      if (!u) {
        return res.status(404).json({ ok: false, error: "ไม่พบสมาชิก" });
      }
      return res.json({
        ok: true,
        user: userService.adminMemberDetail(u)
      });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.post(
  "/members/:id/hearts",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบ id ไม่ถูกต้อง" });
      }
      let pinkDelta = req.body?.pinkDelta != null ? Number(req.body.pinkDelta) : null;
      let redDelta = req.body?.redDelta != null ? Number(req.body.redDelta) : null;
      if (pinkDelta == null && redDelta == null && req.body?.delta != null) {
        pinkDelta = Number(req.body.delta);
        redDelta = 0;
      }
      if (pinkDelta == null) pinkDelta = 0;
      if (redDelta == null) redDelta = 0;
      if (!Number.isFinite(pinkDelta) || Math.floor(pinkDelta) !== pinkDelta) {
        return res.status(400).json({
          ok: false,
          error: "pinkDelta ต้องเป็นจำนวนเต็ม"
        });
      }
      if (!Number.isFinite(redDelta) || Math.floor(redDelta) !== redDelta) {
        return res.status(400).json({
          ok: false,
          error: "redDelta ต้องเป็นจำนวนเต็ม"
        });
      }
      if (pinkDelta === 0 && redDelta === 0) {
        return res.status(400).json({
          ok: false,
          error: "ส่ง pinkDelta หรือ redDelta อย่างน้อยหนึ่งค่า (ไม่ใช่ 0 ทั้งคู่)"
        });
      }
      if (Math.abs(pinkDelta) > 1_000_000 || Math.abs(redDelta) > 1_000_000) {
        return res.status(400).json({ ok: false, error: "ค่าปรับใหญ่เกินไป" });
      }
      const u = await userService.findById(id);
      if (!u) {
        return res.status(404).json({ ok: false, error: "ไม่พบสมาชิก" });
      }
      const updated = await userService.adjustDualHearts(id, pinkDelta, redDelta);
      return res.json({
        ok: true,
        user: userService.adminMemberDetail(updated)
      });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.get(
  "/heart-packages",
  authMiddleware,
  requireRole("admin"),
  async (_req, res) => {
    try {
      const packages = await heartPackageService.listAllAdmin();
      return res.json({ ok: true, packages });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({
          ok: false,
          error: "ต้องมี PostgreSQL (DATABASE_URL)"
        });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.post(
  "/heart-packages",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const pkg = await heartPackageService.create(req.body || {});
      return res.json({ ok: true, package: pkg });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({
          ok: false,
          error: "ต้องมี PostgreSQL (DATABASE_URL)"
        });
      }
      if (e.code === "VALIDATION") {
        return res.status(400).json({ ok: false, error: e.message });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.patch(
  "/heart-packages/:id",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบ id ไม่ถูกต้อง" });
      }
      const pkg = await heartPackageService.update(id, req.body || {});
      if (!pkg) {
        return res.status(404).json({ ok: false, error: "ไม่พบแพ็กเกจ" });
      }
      return res.json({ ok: true, package: pkg });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({
          ok: false,
          error: "ต้องมี PostgreSQL (DATABASE_URL)"
        });
      }
      if (e.code === "VALIDATION") {
        return res.status(400).json({ ok: false, error: e.message });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.get(
  "/heart-purchases/pending",
  authMiddleware,
  requireRole("admin"),
  async (_req, res) => {
    try {
      const purchases = await heartPurchaseService.listPendingForAdmin();
      return res.json({ ok: true, purchases });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({
          ok: false,
          error: "ต้องมี PostgreSQL (DATABASE_URL)"
        });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.post(
  "/heart-purchases/:id/approve",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบ id ไม่ถูกต้อง" });
      }
      const note = req.body?.note != null ? String(req.body.note) : null;
      await heartPurchaseService.approve(id, req.userId, note);
      return res.json({ ok: true });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({
          ok: false,
          error: "ต้องมี PostgreSQL (DATABASE_URL)"
        });
      }
      if (e.code === "NOT_FOUND" || e.code === "BAD_STATUS") {
        return res.status(400).json({ ok: false, error: e.message });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.post(
  "/heart-purchases/:id/reject",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบ id ไม่ถูกต้อง" });
      }
      const note = req.body?.note != null ? String(req.body.note) : null;
      await heartPurchaseService.reject(id, req.userId, note);
      return res.json({ ok: true });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({
          ok: false,
          error: "ต้องมี PostgreSQL (DATABASE_URL)"
        });
      }
      if (e.code === "NOT_FOUND") {
        return res.status(400).json({ ok: false, error: e.message });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.post(
  "/members/:id/password",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบ id ไม่ถูกต้อง" });
      }
      const parsed = validatePassword(req.body?.newPassword);
      if (!parsed.ok) {
        return res.status(400).json({ ok: false, error: parsed.error });
      }
      const u = await userService.findById(id);
      if (!u) {
        return res.status(404).json({ ok: false, error: "ไม่พบสมาชิก" });
      }
      const hash = bcrypt.hashSync(parsed.value, 10);
      await userService.setPasswordHashOnly(id, hash);
      return res.json({ ok: true, message: "ตั้งรหัสผ่านใหม่แล้ว" });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.get("/shops", authMiddleware, requireRole("admin"), async (_req, res) => {
  try {
    const shops = await shopService.listAllForAdmin();
    return res.json({ ok: true, shops });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** เกมพลิกการ์ด — legacy + เกมส่วนกลาง (central_games) */
router.get("/game", authMiddleware, requireRole("admin"), async (_req, res) => {
  try {
    const heartCost = Number(process.env.GAME_HEART_COST || 0);
    const legacy = getAdminSnapshot();
    let central = null;
    try {
      const c = await centralGameService.getActiveGameSnapshot();
      if (c) {
        central = {
          active: true,
          game: c.game,
          rulesCount: c.rules.length,
          imagesFilled: c.imageUrl.size,
          expectedImages: c.game.setCount * c.game.imagesPerSet,
          ...getAdminSnapshotCentral(
            c.game.tileCount,
            c.game.setCount,
            c.game.imagesPerSet,
            c.rules.length
          )
        };
      }
    } catch (e) {
      if (e.code !== "DB_REQUIRED") throw e;
    }
    return res.json({
      ok: true,
      heartCost,
      legacy,
      central,
      persistenceNote:
        "รอบเกมอยู่ในหน่วยความจำ — redeploy/restart ล้าง session · เกมส่วนกลางตั้งค่าในแท็บ「เกมส่วนกลาง」"
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.get(
  "/central-games",
  authMiddleware,
  requireRole("admin"),
  async (_req, res) => {
    try {
      const games = await centralGameService.listGamesForAdmin();
      return res.json({ ok: true, games });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({ ok: false, error: "ต้องมี PostgreSQL" });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.post(
  "/central-games",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const snap = await centralGameService.createGame({
        title: req.body?.title,
        tileCount: req.body?.tileCount,
        setCount: req.body?.setCount,
        imagesPerSet: req.body?.imagesPerSet,
        heartCost: req.body?.heartCost,
        pinkHeartCost: req.body?.pinkHeartCost,
        redHeartCost: req.body?.redHeartCost,
        createdBy: req.userId
      });
      return res.json({ ok: true, game: snap.game, snapshot: snap });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({ ok: false, error: "ต้องมี PostgreSQL" });
      }
      if (e.code === "VALIDATION") {
        return res.status(400).json({ ok: false, error: e.message });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.get(
  "/central-games/:id",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบ id ไม่ถูกต้อง" });
      }
      const snap = await centralGameService.getGameSnapshotById(id);
      if (!snap) {
        return res.status(404).json({ ok: false, error: "ไม่พบเกม" });
      }
      const images = [];
      for (const [k, url] of snap.imageUrl.entries()) {
        const [si, ii] = k.split("-").map(Number);
        images.push({ setIndex: si, imageIndex: ii, imageUrl: url });
      }
      images.sort((a, b) => a.setIndex - b.setIndex || a.imageIndex - b.imageIndex);
      return res.json({
        ok: true,
        game: snap.game,
        images,
        rules: snap.rules
      });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({ ok: false, error: "ต้องมี PostgreSQL" });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.patch(
  "/central-games/:id",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบ id ไม่ถูกต้อง" });
      }
      const snap = await centralGameService.updateGameMeta(id, req.body || {});
      if (!snap) {
        return res.status(404).json({ ok: false, error: "ไม่พบเกม" });
      }
      return res.json({ ok: true, snapshot: snap });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({ ok: false, error: "ต้องมี PostgreSQL" });
      }
      if (e.code === "VALIDATION") {
        return res.status(400).json({ ok: false, error: e.message });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.put(
  "/central-games/:id/images",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบ id ไม่ถูกต้อง" });
      }
      const snap = await centralGameService.replaceImages(id, req.body?.images);
      return res.json({ ok: true, snapshot: snap });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({ ok: false, error: "ต้องมี PostgreSQL" });
      }
      if (e.code === "VALIDATION" || e.code === "NOT_FOUND") {
        return res.status(400).json({ ok: false, error: e.message });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.put(
  "/central-games/:id/rules",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบ id ไม่ถูกต้อง" });
      }
      const snap = await centralGameService.replaceRules(id, req.body?.rules);
      return res.json({ ok: true, snapshot: snap });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({ ok: false, error: "ต้องมี PostgreSQL" });
      }
      if (e.code === "VALIDATION" || e.code === "NOT_FOUND") {
        return res.status(400).json({ ok: false, error: e.message });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.post(
  "/central-games/:id/activate",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบ id ไม่ถูกต้อง" });
      }
      const snap = await centralGameService.setActiveGame(id);
      return res.json({ ok: true, snapshot: snap });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({ ok: false, error: "ต้องมี PostgreSQL" });
      }
      if (e.code === "VALIDATION" || e.code === "NOT_FOUND") {
        return res.status(400).json({ ok: false, error: e.message });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.post(
  "/central-games/:id/deactivate",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบ id ไม่ถูกต้อง" });
      }
      await centralGameService.deactivateGame(id);
      return res.json({ ok: true });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({ ok: false, error: "ต้องมี PostgreSQL" });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.delete(
  "/central-games/:id",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบ id ไม่ถูกต้อง" });
      }
      await centralGameService.deleteGame(id);
      return res.json({ ok: true });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({ ok: false, error: "ต้องมี PostgreSQL" });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

/** คำขอเปลี่ยนชื่อ–นามสกุลที่รอดำเนินการ */
router.get(
  "/name-change-requests",
  authMiddleware,
  requireRole("admin"),
  async (_req, res) => {
    try {
      const list = await nameChangeRequestService.listPending();
      const requests = await Promise.all(
        list.map(async (r) => {
          const u = await userService.findById(r.userId);
          return {
            ...r,
            username: u?.username ?? null,
            currentFirstName: u?.firstName ?? null,
            currentLastName: u?.lastName ?? null,
            countryCode: u?.countryCode ?? "TH"
          };
        })
      );
      return res.json({ ok: true, requests });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.post(
  "/name-change-requests/:id/approve",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const row = await nameChangeRequestService.findById(id);
      if (!row || row.status !== "pending") {
        return res.status(404).json({
          ok: false,
          error: "ไม่พบคำขอหรือดำเนินการแล้ว"
        });
      }
      await userService.updateOfficialNames(
        row.userId,
        row.requestedFirstName,
        row.requestedLastName
      );
      const note = req.body?.note != null ? String(req.body.note).slice(0, 500) : null;
      await nameChangeRequestService.setStatus(id, "approved", note);
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.post(
  "/name-change-requests/:id/reject",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const row = await nameChangeRequestService.findById(id);
      if (!row || row.status !== "pending") {
        return res.status(404).json({
          ok: false,
          error: "ไม่พบคำขอหรือดำเนินการแล้ว"
        });
      }
      const note = req.body?.note != null ? String(req.body.note).slice(0, 500) : null;
      await nameChangeRequestService.setStatus(id, "rejected", note);
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

module.exports = { router };
