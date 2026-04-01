const express = require("express");
const bcrypt = require("bcryptjs");
const {
  authMiddleware,
  requireRole,
  signImpersonationToken,
  publicUserWithRoomGiftRed
} = require("./authRouter");
const { ADMIN, MEMBER } = require("./constants/roles");
const { hasCapability, listCapabilitiesForRole } = require("./permissions");
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
const centralPrizeAwardService = require("./services/centralPrizeAwardService");
const centralPrizeWithdrawalService = require("./services/centralPrizeWithdrawalService");
const heartLedgerService = require("./services/heartLedgerService");
const roomRedGiftService = require("./services/roomRedGiftService");
const phoneHistoryService = require("./services/phoneHistoryService");
const {
  runMarch2026AunyaweePhongCleanup,
  previewMarch2026AunyaweePhongCleanup
} = require("./services/oneoffUserCleanupMarch2026");

const router = express.Router();

function isAdminImpersonationEnabled() {
  const v = process.env.ADMIN_IMPERSONATION_ENABLED;
  return v === "true" || v === "1";
}

function isUuidParam(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(id || "")
  );
}

function requireGameBuilderRole(req, res, next) {
  const r = req.userRole || MEMBER;
  const ok =
    hasCapability(r, "create_central_game") ||
    hasCapability(r, "manage_own_central_game");
  if (!ok) {
    return res.status(403).json({
      ok: false,
      error:
        "ไม่มีสิทธิ์ใช้สตูดิโอเกมส่วนกลางของสมาชิก — ล็อกอินใหม่หรือติดต่อผู้ดูแลหากคุณเป็นสมาชิกแล้ว",
      code: "CAPABILITY_DENIED"
    });
  }
  next();
}

/** แอดมินทำได้ทุกเกม — สมาชิกทำได้เฉพาะเกมที่สร้างเอง (created_by) */
async function assertOwnOrAdminCentralGame(req, gameId) {
  if (req.userRole === "admin") return null;
  const snap = await centralGameService.getGameSnapshotById(gameId);
  if (!snap) return { status: 404, error: "ไม่พบเกม" };
  const owner = snap.game.createdBy;
  if (!owner || owner !== req.userId) {
    return { status: 403, error: "ไม่มีสิทธิ์จัดการเกมนี้" };
  }
  return null;
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
      let heartLedger = [];
      try {
        heartLedger = await heartLedgerService.listForUser(id, { limit: 80 });
      } catch (le) {
        if (le.code !== "DB_REQUIRED") throw le;
      }
      let roomRedCodes = [];
      try {
        roomRedCodes = await roomRedGiftService.listCodesForCreator(id);
      } catch (re) {
        if (re.code !== "DB_REQUIRED") throw re;
      }
      let roomRedRedemptions = [];
      try {
        roomRedRedemptions = await roomRedGiftService.listRedemptionsForUser(id, 300);
      } catch (re2) {
        if (re2.code !== "DB_REQUIRED") throw re2;
      }
      let phoneHistory = [];
      try {
        phoneHistory = await phoneHistoryService.listForUser(id);
      } catch (pe) {
        if (pe.code !== "DB_REQUIRED") throw pe;
      }
      return res.json({
        ok: true,
        user: userService.adminMemberDetail(u),
        orders,
        shops,
        stats,
        nameChangeRequestPending,
        heartLedger,
        roomRedCodes,
        roomRedRedemptions,
        phoneHistory,
        heartsNote:
          "ยูสเซอร์ดูได้จากตาราง/รายละเอียด · รหัสผ่านเก็บแบบแฮช (ดูข้อความจริงไม่ได้) — ตั้งรหัสใหม่ได้ด้านล่าง · ระงับบัญชี = ห้ามล็อกอินและห้ามใช้ API ด้วยโทเค็นเดิม · เกมส่วนกลางแก้ได้ที่แท็บ「เกมส่วนกลาง」"
      });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

/**
 * แอดมินขอโทเค็นชั่วคราวเพื่อดูหน้าสมาชิกเหมือนผู้ใช้จริง (ต้องเปิด ADMIN_IMPERSONATION_ENABLED ที่ API)
 */
router.post(
  "/members/:id/impersonate",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      if (!isAdminImpersonationEnabled()) {
        return res.status(403).json({
          ok: false,
          error:
            "ฟีเจอร์ดูในนามสมาชิกยังไม่เปิด — ตั้ง ADMIN_IMPERSONATION_ENABLED=true ที่บริการ API (หลังเปิดใช้งานจริงควรปิด)"
        });
      }
      const { id } = req.params;
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบ id ไม่ถูกต้อง" });
      }
      const target = await userService.findById(id);
      if (!target) {
        return res.status(404).json({ ok: false, error: "ไม่พบสมาชิก" });
      }
      if (target.accountDisabled) {
        return res.status(403).json({
          ok: false,
          error: "บัญชีนี้ถูกระงับ — ไม่สามารถดูในนามได้"
        });
      }
      const r = target.role || "member";
      if (r === ADMIN) {
        return res.status(403).json({
          ok: false,
          error: "ไม่อนุญาตให้ดูในนามบัญชีแอดมิน"
        });
      }
      const token = signImpersonationToken(target, req.userId);
      return res.json({
        ok: true,
        token,
        user: await publicUserWithRoomGiftRed(target),
        capabilities: listCapabilitiesForRole(target.role || MEMBER),
        impersonation: {
          active: true,
          adminUsername: req.username || null
        }
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
      let redGiveawayDelta =
        req.body?.redGiveawayDelta != null ? Number(req.body.redGiveawayDelta) : 0;
      if (pinkDelta == null && redDelta == null && req.body?.delta != null) {
        pinkDelta = Number(req.body.delta);
        redDelta = 0;
      }
      if (pinkDelta == null) pinkDelta = 0;
      if (redDelta == null) redDelta = 0;
      if (!Number.isFinite(redGiveawayDelta) || Math.floor(redGiveawayDelta) !== redGiveawayDelta) {
        return res.status(400).json({
          ok: false,
          error: "redGiveawayDelta ต้องเป็นจำนวนเต็ม"
        });
      }
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
      if (pinkDelta === 0 && redDelta === 0 && redGiveawayDelta === 0) {
        return res.status(400).json({
          ok: false,
          error:
            "ส่ง pinkDelta / redDelta / redGiveawayDelta อย่างน้อยหนึ่งค่า (ไม่ใช่ 0 ทั้งหมด)"
        });
      }
      if (
        Math.abs(pinkDelta) > 1_000_000 ||
        Math.abs(redDelta) > 1_000_000 ||
        Math.abs(redGiveawayDelta) > 1_000_000
      ) {
        return res.status(400).json({ ok: false, error: "ค่าปรับใหญ่เกินไป" });
      }
      const u = await userService.findById(id);
      if (!u) {
        return res.status(404).json({ ok: false, error: "ไม่พบสมาชิก" });
      }
      const updated = await userService.adjustAdminTripleHearts(
        id,
        pinkDelta,
        redDelta,
        redGiveawayDelta,
        {
          kind: "admin_adjust",
          label: `แอดมิน @${req.username || "?"} ปรับยอดหัวใจ`,
          meta: {
            adminUsername: req.username || null,
            pinkDelta,
            redDelta,
            redGiveawayDelta
          }
        }
      );
      return res.json({
        ok: true,
        user: userService.adminMemberDetail(updated)
      });
    } catch (e) {
      if (e.code === "VALIDATION") {
        return res.status(400).json({ ok: false, error: e.message });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.patch(
  "/members/:id",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบ id ไม่ถูกต้อง" });
      }
      const fwd = req.headers["x-forwarded-for"];
      const clientIp =
        (typeof fwd === "string" && fwd.split(",")[0].trim()) ||
        req.socket?.remoteAddress ||
        null;
      const updated = await userService.adminPatchMember(id, req.body || {}, {
        clientIp
      });
      return res.json({
        ok: true,
        user: userService.adminMemberDetail(updated)
      });
    } catch (e) {
      if (e.code === "NOT_FOUND") {
        return res.status(404).json({ ok: false, error: e.message });
      }
      if (
        e.code === "PHONE_TAKEN" ||
        e.code === "USERNAME_TAKEN" ||
        e.code === "VALIDATION"
      ) {
        return res.status(400).json({ ok: false, error: e.message });
      }
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
          error: "ฐานข้อมูลยังไม่ได้เชื่อมต่อ — ตรวจการตั้งค่า PostgreSQL บนบริการ API"
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
          error: "ฐานข้อมูลยังไม่ได้เชื่อมต่อ — ตรวจการตั้งค่า PostgreSQL บนบริการ API"
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
          error: "ฐานข้อมูลยังไม่ได้เชื่อมต่อ — ตรวจการตั้งค่า PostgreSQL บนบริการ API"
        });
      }
      if (e.code === "VALIDATION") {
        return res.status(400).json({ ok: false, error: e.message });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.delete(
  "/heart-packages/:id",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบ id ไม่ถูกต้อง" });
      }
      const removed = await heartPackageService.removeById(id);
      if (!removed) {
        return res.status(404).json({ ok: false, error: "ไม่พบแพ็กเกจ" });
      }
      return res.json({ ok: true, deleted: { id: removed.id, title: removed.title } });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({
          ok: false,
          error: "ฐานข้อมูลยังไม่ได้เชื่อมต่อ — ตรวจการตั้งค่า PostgreSQL บนบริการ API"
        });
      }
      if (e.code === "CONFLICT") {
        return res.status(409).json({ ok: false, error: e.message });
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
          error: "ฐานข้อมูลยังไม่ได้เชื่อมต่อ — ตรวจการตั้งค่า PostgreSQL บนบริการ API"
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
          error: "ฐานข้อมูลยังไม่ได้เชื่อมต่อ — ตรวจการตั้งค่า PostgreSQL บนบริการ API"
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
          error: "ฐานข้อมูลยังไม่ได้เชื่อมต่อ — ตรวจการตั้งค่า PostgreSQL บนบริการ API"
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

/** สร้างร้าน — slug ภาษาอังกฤษตัวเล็ก a-z0-9- */
router.post("/shops", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const name = String((req.body || {}).name || "").trim().slice(0, 255);
    let slug = String((req.body || {}).slug || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64);
    const ownerUserId = (req.body || {}).ownerUserId;
    const ownerUsernameRaw = String((req.body || {}).ownerUsername || "").trim();
    if (!name) {
      return res.status(400).json({ ok: false, error: "กรุณากรอกชื่อร้าน" });
    }
    if (!slug) {
      slug = `shop-${Date.now().toString(36)}`;
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(slug)) {
      return res.status(400).json({
        ok: false,
        error: "slug ใช้ได้เฉพาะ a-z 0-9 และ -"
      });
    }
    let owner = null;
    if (ownerUserId != null && String(ownerUserId).trim() !== "") {
      if (!isUuidParam(ownerUserId)) {
        return res.status(400).json({ ok: false, error: "ownerUserId ไม่ถูกต้อง" });
      }
      owner = await userService.findById(String(ownerUserId).trim());
      if (!owner) {
        return res.status(400).json({ ok: false, error: "ไม่พบสมาชิกเจ้าของร้าน" });
      }
    } else if (ownerUsernameRaw) {
      owner = await userService.findByUsername(ownerUsernameRaw);
      if (!owner) {
        return res
          .status(400)
          .json({ ok: false, error: `ไม่พบยูสเซอร์「${ownerUsernameRaw}」` });
      }
    }
    const shop = await shopService.createShop({
      name,
      slug,
      ownerUserId: owner ? owner.id : null
    });
    return res.json({ ok: true, shop });
  } catch (e) {
    if (e.code === "23505" || /unique/i.test(String(e.message))) {
      return res.status(409).json({ ok: false, error: "slug นี้มีในระบบแล้ว" });
    }
    if (e.code === "DB_REQUIRED") {
      return res.status(503).json({ ok: false, error: "ยังไม่มีฐานข้อมูล" });
    }
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
          expectedImages: c.game.tileCount,
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
        "รอบเกมที่กำลังเล่นจะถูกล้างเมื่อรีสตาร์ทหรืออัปเดตเซิร์ฟเวอร์ — ผู้เล่นที่ค้างอาจต้องเริ่มรอบใหม่ · เกมส่วนกลางตั้งค่าในแท็บ「เกมส่วนกลาง」"
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.get(
  "/central-games",
  authMiddleware,
  requireGameBuilderRole,
  async (req, res) => {
    try {
      const isAdmin = req.userRole === "admin";
      const games = await centralGameService.listGamesForAdmin(
        isAdmin ? {} : { creatorId: req.userId }
      );
      return res.json({ ok: true, games });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({
          ok: false,
          error: "ฐานข้อมูลยังไม่ได้เชื่อมต่อ — ตรวจการตั้งค่า PostgreSQL บนบริการ API"
        });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

/** รายการผู้ได้รับรางวัลจากเกมส่วนกลาง — ใช้ติดตามการจ่ายรางวัล */
router.get(
  "/central-prize-awards",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const gameId = req.query.gameId != null ? String(req.query.gameId).trim() : "";
      const limitRaw = req.query.limit != null ? Math.floor(Number(req.query.limit)) : 500;
      const awards = await centralPrizeAwardService.listAllAwardsForAdmin({
        gameId: gameId || null,
        limit: limitRaw
      });
      return res.json({ ok: true, awards });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({
          ok: false,
          error: "ฐานข้อมูลยังไม่ได้เชื่อมต่อ — ตรวจการตั้งค่า PostgreSQL บนบริการ API"
        });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

/** ข้อมูลคำขอถอนรางวัลสำหรับหน้าแอดมิน「จ่ายรางวัล」 */
router.get(
  "/central-prize-withdrawals/admin-data",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const limRaw =
        req.query.withdrawalsLimit != null ? Math.floor(Number(req.query.withdrawalsLimit)) : 8000;
      const [pendingWithdrawals, withdrawals, reserveTotals] = await Promise.all([
        centralPrizeWithdrawalService.listPendingWithdrawalsForAdmin(),
        centralPrizeWithdrawalService.listAllWithdrawalsForAdmin({ limit: limRaw }),
        centralPrizeWithdrawalService.withdrawalReserveTotalsByRequester()
      ]);
      return res.json({
        ok: true,
        pendingWithdrawals,
        withdrawals,
        reserveTotals
      });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.json({
          ok: true,
          pendingWithdrawals: [],
          withdrawals: [],
          reserveTotals: [],
          dbRequired: true
        });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.post(
  "/central-prize-withdrawals/:id/admin-resolve",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const id = String(req.params.id || "").trim();
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบรหัสคำขอไม่ถูกต้อง" });
      }
      const action = req.body?.action;
      const note = req.body?.note;
      const transferSlipUrl = req.body?.transferSlipUrl;
      const rec = await centralPrizeWithdrawalService.resolveByAdmin({
        withdrawalId: id,
        action,
        note,
        transferSlipUrl
      });
      return res.json({ ok: true, withdrawal: rec });
    } catch (e) {
      if (e.code === "NOT_FOUND") {
        return res.status(404).json({ ok: false, error: e.message });
      }
      if (e.code === "VALIDATION" || e.code === "CONFLICT") {
        return res.status(400).json({ ok: false, error: e.message });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.post(
  "/central-games",
  authMiddleware,
  requireGameBuilderRole,
  async (req, res) => {
    try {
      const snap = await centralGameService.createGame({
        title: req.body?.title,
        description: req.body?.description,
        gameCoverUrl: req.body?.gameCoverUrl,
        tileCount: req.body?.tileCount,
        setCount: req.body?.setCount,
        imagesPerSet: req.body?.imagesPerSet,
        heartCost: req.body?.heartCost,
        pinkHeartCost: req.body?.pinkHeartCost,
        redHeartCost: req.body?.redHeartCost,
        heartCurrencyMode: req.body?.heartCurrencyMode,
        acceptsPinkHearts: req.body?.acceptsPinkHearts,
        setImageCounts: req.body?.setImageCounts,
        createdBy: req.userId
      });
      return res.json({ ok: true, game: snap.game, snapshot: snap });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({
          ok: false,
          error: "ฐานข้อมูลยังไม่ได้เชื่อมต่อ — ตรวจการตั้งค่า PostgreSQL บนบริการ API"
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
  "/central-games/:id",
  authMiddleware,
  requireGameBuilderRole,
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบ id ไม่ถูกต้อง" });
      }
      const deny = await assertOwnOrAdminCentralGame(req, id);
      if (deny) {
        return res.status(deny.status).json({ ok: false, error: deny.error });
      }
      let snap = await centralGameService.getGameSnapshotById(id);
      if (!snap) {
        return res.status(404).json({ ok: false, error: "ไม่พบเกม" });
      }
      if (
        snap.game &&
        (snap.game.isPublished || snap.game.isActive) &&
        (!snap.game.gameCode || !String(snap.game.gameCode).trim())
      ) {
        try {
          await centralGameService.ensurePublishedGameCode(id);
          const again = await centralGameService.getGameSnapshotById(id);
          if (again) snap = again;
        } catch (err) {
          console.error("[admin] ensurePublishedGameCode on GET central-games/:id", id, err.message);
        }
      }
      const images = [];
      for (const [k, url] of snap.imageUrl.entries()) {
        const [si, ii] = k.split("-").map(Number);
        images.push({ setIndex: si, imageIndex: ii, imageUrl: url });
      }
      images.sort((a, b) => a.setIndex - b.setIndex || a.imageIndex - b.imageIndex);
      const prizeAwardCount = await centralGameService.getPrizeAwardCountForGame(id);
      const playCount = await centralGameService.getPlayCountForGame(id);
      const awardByRule = await centralGameService.getPrizeAwardCountByRule(id);
      const rules = (snap.rules || []).map((r) => {
        const rid = r?.id != null ? String(r.id).trim().toLowerCase() : "";
        const awarded = Math.max(0, Math.floor(Number(awardByRule[rid])) || 0);
        const total =
          r?.prizeCategory === "none"
            ? null
            : Math.max(1, Math.floor(Number(r?.prizeTotalQty) || 1));
        const remaining = total == null ? null : Math.max(0, total - awarded);
        return {
          ...r,
          prizeAwardedCount: awarded,
          prizeRemainingQty: remaining
        };
      });
      return res.json({
        ok: true,
        game: snap.game,
        prizeAwardCount,
        playCount,
        images,
        rules
      });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({
          ok: false,
          error: "ฐานข้อมูลยังไม่ได้เชื่อมต่อ — ตรวจการตั้งค่า PostgreSQL บนบริการ API"
        });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.patch(
  "/central-games/:id",
  authMiddleware,
  requireGameBuilderRole,
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบ id ไม่ถูกต้อง" });
      }
      const deny = await assertOwnOrAdminCentralGame(req, id);
      if (deny) {
        return res.status(deny.status).json({ ok: false, error: deny.error });
      }
      const snap = await centralGameService.updateGameMeta(id, req.body || {}, {
        allowUnsafeEdit: req.userRole === "admin"
      });
      if (!snap) {
        return res.status(404).json({ ok: false, error: "ไม่พบเกม" });
      }
      return res.json({ ok: true, snapshot: snap });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({
          ok: false,
          error: "ฐานข้อมูลยังไม่ได้เชื่อมต่อ — ตรวจการตั้งค่า PostgreSQL บนบริการ API"
        });
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
  requireGameBuilderRole,
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบ id ไม่ถูกต้อง" });
      }
      const deny = await assertOwnOrAdminCentralGame(req, id);
      if (deny) {
        return res.status(deny.status).json({ ok: false, error: deny.error });
      }
      const snap = await centralGameService.replaceImages(id, req.body?.images, {
        oneImagePerSet: Boolean(req.body?.oneImagePerSet),
        allowUnsafeEdit: req.userRole === "admin"
      });
      return res.json({ ok: true, snapshot: snap });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({
          ok: false,
          error: "ฐานข้อมูลยังไม่ได้เชื่อมต่อ — ตรวจการตั้งค่า PostgreSQL บนบริการ API"
        });
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
  requireGameBuilderRole,
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบ id ไม่ถูกต้อง" });
      }
      const deny = await assertOwnOrAdminCentralGame(req, id);
      if (deny) {
        return res.status(deny.status).json({ ok: false, error: deny.error });
      }
      const snap = await centralGameService.replaceRules(id, req.body?.rules, {
        allowUnsafeEdit: req.userRole === "admin"
      });
      return res.json({ ok: true, snapshot: snap });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({
          ok: false,
          error: "ฐานข้อมูลยังไม่ได้เชื่อมต่อ — ตรวจการตั้งค่า PostgreSQL บนบริการ API"
        });
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
  requireGameBuilderRole,
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบ id ไม่ถูกต้อง" });
      }
      const deny = await assertOwnOrAdminCentralGame(req, id);
      if (deny) {
        return res.status(deny.status).json({ ok: false, error: deny.error });
      }
      const snap = await centralGameService.setActiveGame(id);
      return res.json({ ok: true, snapshot: snap });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({
          ok: false,
          error: "ฐานข้อมูลยังไม่ได้เชื่อมต่อ — ตรวจการตั้งค่า PostgreSQL บนบริการ API"
        });
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
  requireGameBuilderRole,
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบ id ไม่ถูกต้อง" });
      }
      const deny = await assertOwnOrAdminCentralGame(req, id);
      if (deny) {
        return res.status(deny.status).json({ ok: false, error: deny.error });
      }
      await centralGameService.deactivateGame(id);
      return res.json({ ok: true });
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({
          ok: false,
          error: "ฐานข้อมูลยังไม่ได้เชื่อมต่อ — ตรวจการตั้งค่า PostgreSQL บนบริการ API"
        });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

router.delete(
  "/central-games/:id",
  authMiddleware,
  requireGameBuilderRole,
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isUuidParam(id)) {
        return res.status(400).json({ ok: false, error: "รูปแบบ id ไม่ถูกต้อง" });
      }
      const deny = await assertOwnOrAdminCentralGame(req, id);
      if (deny) {
        return res.status(deny.status).json({ ok: false, error: deny.error });
      }
      await centralGameService.deleteGame(id);
      return res.json({ ok: true });
    } catch (e) {
      if (e.code === "GAME_HAS_PLAY_HISTORY") {
        return res.status(400).json({ ok: false, error: e.message });
      }
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({
          ok: false,
          error: "ฐานข้อมูลยังไม่ได้เชื่อมต่อ — ตรวจการตั้งค่า PostgreSQL บนบริการ API"
        });
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

/**
 * ดูก่อนรัน cleanup — แอดมินอย่างเดียว (ไม่ต้อง ONEOFF_USER_CLEANUP_KEY)
 * GET .../oneoff/cleanup-march-2026-preview
 */
router.get(
  "/oneoff/cleanup-march-2026-preview",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const result = await previewMarch2026AunyaweePhongCleanup();
      return res.json(result);
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({ ok: false, error: e.message });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

/**
 * One-off: ลบข้อมูล aunyawee + phongphiphat47
 *
 * Body (optional): forceAunyaweeBalanceAdjust: true — ปรับยอด aunyawee แม้ไม่มีแถวลบ (ระวังรันซ้ำ)
 * Body (optional): aunyaweeExactBalances: { pink, redPlayable, redGiveaway } — ตั้งยอดตรงๆ (ทับสูตร 4999)
 *   ใช้เมื่อยอดจริงไม่ตรงสูตร เช่น หลังคืนแดงจากลบรหัส เหลือ 5099 — ส่งทั้งสามฟิลด์เป็นตัวเลข ≥ 0
 *
 * curl -X POST "$API/api/admin/oneoff/cleanup-march-2026-users" \
 *   -H "Authorization: Bearer <admin_jwt>" \
 *   -H "Content-Type: application/json" \
 *   -H "x-oneoff-user-cleanup-key: $ONEOFF_USER_CLEANUP_KEY" \
 *   -d '{"confirm":"DELETE_AUNYAWEE_PHONG_MARCH_2026"}'
 */
router.post(
  "/oneoff/cleanup-march-2026-users",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const expected = process.env.ONEOFF_USER_CLEANUP_KEY;
      if (!expected || String(expected).length < 8) {
        return res.status(503).json({
          ok: false,
          error:
            "ยังไม่เปิดใช้ — ตั้ง ONEOFF_USER_CLEANUP_KEY ใน API (อย่างน้อย 8 ตัว) แล้ว deploy ชั่วคราว"
        });
      }
      const got = req.headers["x-oneoff-user-cleanup-key"];
      if (String(got || "") !== String(expected)) {
        return res.status(403).json({ ok: false, error: "คีย์ oneoff ไม่ถูกต้อง" });
      }
      if (req.body?.confirm !== "DELETE_AUNYAWEE_PHONG_MARCH_2026") {
        return res.status(400).json({
          ok: false,
          error: 'ต้องส่ง JSON body.confirm เท่ากับ "DELETE_AUNYAWEE_PHONG_MARCH_2026"'
        });
      }
      const result = await runMarch2026AunyaweePhongCleanup({
        forceAunyaweeBalanceAdjust: Boolean(req.body?.forceAunyaweeBalanceAdjust),
        aunyaweeExactBalances: req.body?.aunyaweeExactBalances
      });
      return res.json(result);
    } catch (e) {
      if (e.code === "DB_REQUIRED") {
        return res.status(503).json({ ok: false, error: e.message });
      }
      if (e.code === "NOT_FOUND") {
        return res.status(404).json({ ok: false, error: e.message });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

module.exports = { router };
