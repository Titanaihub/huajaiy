const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  validateRegisterBody,
  validateLoginBody,
  validateRegisterNames,
  validatePasswordChangeBody
} = require("./authValidators");
const userService = require("./services/userService");
const phoneHistoryService = require("./services/phoneHistoryService");
const nameChangeRequestService = require("./services/nameChangeRequestService");
const shopService = require("./services/shopService");
const centralPrizeAwardService = require("./services/centralPrizeAwardService");
const centralPrizeWithdrawalService = require("./services/centralPrizeWithdrawalService");
const heartLedgerService = require("./services/heartLedgerService");
const roomRedGiftService = require("./services/roomRedGiftService");
const { listCapabilitiesForRole } = require("./permissions");
const {
  validateProfilePatch,
  validateNameChangeRequest
} = require("./profileValidators");
const { MEMBER } = require("./constants/roles");

function capabilitiesPayloadForUser(user) {
  return {
    capabilities: listCapabilitiesForRole(user.role || MEMBER)
  };
}

function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (s && String(s).length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    console.error(
      "JWT_SECRET missing or too short — set a strong secret in production"
    );
  }
  return "dev-only-jwt-secret-change-me";
}

function signToken(user) {
  const role = user.role || MEMBER;
  return jwt.sign(
    { sub: user.id, username: user.username, role },
    getJwtSecret(),
    { expiresIn: "30d" }
  );
}

/** โทเค็นชั่วคราวสำหรับแอดมินตรวจ UI ในนามสมาชิก — อายุสั้น ห้ามใช้แทนรหัสผ่านทั่วไป */
function signImpersonationToken(targetUser, adminUserId) {
  const role = targetUser.role || MEMBER;
  return jwt.sign(
    {
      sub: targetUser.id,
      username: targetUser.username,
      role,
      imp: true,
      adm: adminUserId
    },
    getJwtSecret(),
    { expiresIn: "4h" }
  );
}

/** รวมยอดหัวใจแดงจากรหัสของห้อง (scoped) ให้สอดคล้องกับ GET /me */
async function publicUserWithRoomGiftRed(user) {
  const base = userService.publicUser(user);
  let roomGiftRed = [];
  try {
    roomGiftRed = await roomRedGiftService.listRoomGiftBalancesForUser(user.id);
  } catch (e) {
    if (e.code !== "DB_REQUIRED") throw e;
  }
  return { ...base, roomGiftRed };
}

/** โหลดบทบาทจาก DB ทุกครั้ง — โทเค็นเก่ายังใช้ได้ แต่ role ตามข้อมูลล่าสุด */
async function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "ไม่ได้เข้าสู่ระบบ" });
  }
  const token = h.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch {
    return res
      .status(401)
      .json({ ok: false, error: "โทเค็นไม่ถูกต้องหรือหมดอายุ" });
  }
  req.impersonation =
    payload && payload.imp === true && payload.adm
      ? { adminUserId: String(payload.adm) }
      : null;
  req.userId = payload.sub;
  try {
    const user = await userService.findById(req.userId);
    if (!user) {
      return res.status(401).json({ ok: false, error: "ไม่พบบัญชี" });
    }
    if (user.accountDisabled) {
      return res.status(403).json({
        ok: false,
        error: "บัญชีนี้ถูกระงับการใช้งาน",
        code: "ACCOUNT_DISABLED"
      });
    }
    req.username = user.username;
    req.userRole = user.role || MEMBER;
    next();
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

function requireRole(...allowed) {
  return (req, res, next) => {
    const r = req.userRole || MEMBER;
    if (!allowed.includes(r)) {
      return res.status(403).json({ ok: false, error: "ไม่มีสิทธิ์เข้าถึง" });
    }
    next();
  };
}

/** มี Bearer ที่ถูกต้อง → ตั้ง req.userId · ไม่มีหัวหรือไม่ส่ง → ผู้เล่นทั่วไป (ไม่บังคับล็อกอิน) */
async function optionalAuthMiddleware(req, res, next) {
  req.userId = null;
  req.impersonation = null;
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) return next();
  const token = h.slice("Bearer ".length).trim();
  if (!token) return next();
  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch {
    return res
      .status(401)
      .json({ ok: false, error: "โทเค็นไม่ถูกต้องหรือหมดอายุ" });
  }
  req.impersonation =
    payload && payload.imp === true && payload.adm
      ? { adminUserId: String(payload.adm) }
      : null;
  try {
    const user = await userService.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ ok: false, error: "ไม่พบบัญชี" });
    }
    if (user.accountDisabled) {
      return res.status(403).json({
        ok: false,
        error: "บัญชีนี้ถูกระงับการใช้งาน",
        code: "ACCOUNT_DISABLED"
      });
    }
    req.userId = user.id;
    req.username = user.username;
    req.userRole = user.role || MEMBER;
    next();
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

const router = express.Router();

function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length > 0) {
    return xf.split(",")[0].trim().slice(0, 64);
  }
  if (Array.isArray(xf) && xf[0]) {
    return String(xf[0]).trim().slice(0, 64);
  }
  const ra = req.socket?.remoteAddress || req.connection?.remoteAddress;
  return ra ? String(ra).slice(0, 64) : null;
}

router.post("/check-duplicate-name", async (req, res) => {
  try {
    const n = validateRegisterNames(
      req.body?.countryCode,
      req.body?.firstName,
      req.body?.lastName
    );
    if (!n.ok) {
      return res.status(400).json({ ok: false, error: n.error });
    }
    const dup = await userService.findByThaiFullName(n.firstName, n.lastName);
    return res.json({ ok: true, duplicate: Boolean(dup) });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.post("/register", async (req, res) => {
  try {
    const parsed = validateRegisterBody(req.body || {});
    if (!parsed.ok) {
      return res.status(400).json({ ok: false, error: parsed.error });
    }
    const {
      firstName,
      lastName,
      phone,
      username,
      password,
      countryCode,
      duplicateNameAcknowledged
    } = parsed.data;

    const dup = await userService.findByThaiFullName(firstName, lastName);
    if (dup && !duplicateNameAcknowledged) {
      return res.status(400).json({
        ok: false,
        code: "DUPLICATE_NAME_NEED_ACK",
        error:
          "ชื่อและนามสกุลนี้มีในระบบแล้ว — ยืนยันว่าเป็นคนละคนหรือไม่ (สมัครซ้ำซ้อนจะขัดการจ่ายรางวัล) หากเป็นคนละคนให้ส่ง duplicateNameAcknowledged"
      });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const user = await userService.createUser({
      username,
      passwordHash,
      firstName,
      lastName,
      phone,
      countryCode,
      registrationIp: clientIp(req)
    });
    const token = signToken(user);
    return res.json({
      ok: true,
      token,
      user: await publicUserWithRoomGiftRed(user),
      ...capabilitiesPayloadForUser(user)
    });
  } catch (e) {
    if (e.code === "USERNAME_TAKEN") {
      return res.status(400).json({ ok: false, error: "ชื่อผู้ใช้นี้ถูกใช้แล้ว" });
    }
    if (e.code === "PHONE_TAKEN") {
      return res.status(400).json({
        ok: false,
        error: "เบอร์โทรนี้เคยใช้สมัครสมาชิกแล้ว"
      });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const parsed = validateLoginBody(req.body || {});
    if (!parsed.ok) {
      return res.status(400).json({ ok: false, error: parsed.error });
    }
    const { username, password } = parsed.data;
    const user = await userService.findByUsername(username);
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({
        ok: false,
        error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
      });
    }
    if (user.accountDisabled) {
      return res.status(403).json({
        ok: false,
        error: "บัญชีนี้ถูกระงับการใช้งาน — ติดต่อผู้ดูแลระบบ",
        code: "ACCOUNT_DISABLED"
      });
    }
    const token = signToken(user);
    return res.json({
      ok: true,
      token,
      user: await publicUserWithRoomGiftRed(user)
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await userService.findById(req.userId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "ไม่พบบัญชี" });
    }
    let impersonation = null;
    if (req.impersonation && req.impersonation.adminUserId) {
      const adm = await userService.findById(req.impersonation.adminUserId);
      impersonation = {
        active: true,
        adminUsername: adm ? adm.username : null
      };
    }
    return res.json({
      ok: true,
      user: await publicUserWithRoomGiftRed(user),
      impersonation,
      ...capabilitiesPayloadForUser(user)
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** ความสามารถของ role ปัจจุบัน — ใช้ยืนยันสิทธิ์บนหน้าเว็บ/ดีบักสมาชิกเก่า-ใหม่ */
router.get("/capabilities", authMiddleware, async (req, res) => {
  try {
    const role = req.userRole || MEMBER;
    return res.json({
      ok: true,
      role,
      capabilities: listCapabilitiesForRole(role)
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.patch("/profile", authMiddleware, async (req, res) => {
  try {
    const parsed = validateProfilePatch(req.body || {});
    if (!parsed.ok) {
      return res.status(400).json({ ok: false, error: parsed.error });
    }
    const user = await userService.updateProfile(req.userId, parsed.data, {
      clientIp: clientIp(req)
    });
    if (!user) {
      return res.status(404).json({ ok: false, error: "ไม่พบบัญชี" });
    }
    return res.json({
      ok: true,
      user: await publicUserWithRoomGiftRed(user),
      ...capabilitiesPayloadForUser(user)
    });
  } catch (e) {
    if (e.code === "PHONE_TAKEN") {
      return res.status(400).json({
        ok: false,
        error: "เบอร์โทรนี้เคยใช้สมัครสมาชิกแล้ว"
      });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** สมาชิกเปลี่ยนรหัสผ่าน — ห้ามใช้ขณะแอดมินดูในนามสมาชิก */
router.patch("/password", authMiddleware, async (req, res) => {
  try {
    if (req.impersonation && req.impersonation.adminUserId) {
      return res.status(403).json({
        ok: false,
        error:
          "ไม่สามารถเปลี่ยนรหัสผ่านขณะดูในนามสมาชิก — ออกจากโหมดดูก่อน"
      });
    }
    const parsed = validatePasswordChangeBody(req.body || {});
    if (!parsed.ok) {
      return res.status(400).json({ ok: false, error: parsed.error });
    }
    const user = await userService.findById(req.userId);
    if (!user || !user.passwordHash) {
      return res.status(404).json({ ok: false, error: "ไม่พบบัญชี" });
    }
    if (!bcrypt.compareSync(parsed.data.currentPassword, user.passwordHash)) {
      return res.status(400).json({
        ok: false,
        error: "รหัสผ่านปัจจุบันไม่ถูกต้อง"
      });
    }
    if (bcrypt.compareSync(parsed.data.newPassword, user.passwordHash)) {
      return res.status(400).json({
        ok: false,
        error: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม"
      });
    }
    await userService.setPasswordHashOnly(
      req.userId,
      bcrypt.hashSync(parsed.data.newPassword, 10)
    );
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.get("/phone-history/mine", authMiddleware, async (req, res) => {
  try {
    const history = await phoneHistoryService.listForUser(req.userId);
    return res.json({ ok: true, history });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.post("/name-change-request", authMiddleware, async (req, res) => {
  try {
    const u = await userService.findById(req.userId);
    if (!u) {
      return res.status(404).json({ ok: false, error: "ไม่พบบัญชี" });
    }
    const parsed = validateNameChangeRequest(
      u.countryCode || "TH",
      req.body || {}
    );
    if (!parsed.ok) {
      return res.status(400).json({ ok: false, error: parsed.error });
    }
    const rec = await nameChangeRequestService.createRequest(
      req.userId,
      parsed.data
    );
    return res.json({ ok: true, request: rec });
  } catch (e) {
    if (e.code === "PENDING_NAME_CHANGE_EXISTS") {
      return res.status(400).json({
        ok: false,
        error: "มีคำขอเปลี่ยนชื่อที่รอดำเนินการอยู่แล้ว — รอแอดมินพิจารณาก่อนส่งใหม่"
      });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.get("/name-change-requests/mine", authMiddleware, async (req, res) => {
  try {
    const requests = await nameChangeRequestService.listForUser(req.userId);
    return res.json({ ok: true, requests });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** ร้านที่บัญชีนี้เป็นเจ้าของ — ไม่จำกัด role (สมาชิกทั่วไปได้ []) */
router.get("/shops/mine", authMiddleware, async (req, res) => {
  try {
    const shops = await shopService.listByOwner(req.userId);
    return res.json({ ok: true, shops });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** ประวัติได้รับ/หักหัวใจชมพู–แดง (ฐานข้อมูล) */
router.get("/heart-ledger/mine", authMiddleware, async (req, res) => {
  try {
    const limit = req.query.limit != null ? Number(req.query.limit) : 80;
    const offset = req.query.offset != null ? Number(req.query.offset) : 0;
    const entries = await heartLedgerService.listForUser(req.userId, { limit, offset });
    return res.json({ ok: true, entries });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.json({ ok: true, entries: [], dbRequired: true });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** ประวัติแลกรหัสหัวใจแดงของฉัน (อ่านจากตาราง redemption โดยตรง) */
router.get("/room-red-redemptions/mine", authMiddleware, async (req, res) => {
  try {
    const limit = req.query.limit != null ? Number(req.query.limit) : 300;
    const items = await roomRedGiftService.listRedemptionsForUser(req.userId, limit);
    return res.json({ ok: true, items });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.json({ ok: true, items: [], dbRequired: true });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** รางวัลจากเกมส่วนกลางที่บันทึกไว้กับบัญชีนี้ */
router.get("/central-prize-awards/mine", authMiddleware, async (req, res) => {
  try {
    const awards = await centralPrizeAwardService.listAwardsForUser(req.userId);
    return res.json({ ok: true, awards });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.json({ ok: true, awards: [], dbRequired: true });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

const UUID_PARAM_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** ยอดถอนได้คงเหลือต่อผู้สร้างเกม (เงินสด) */
router.get("/central-prize-withdrawals/available", authMiddleware, async (req, res) => {
  try {
    const creatorUsername = req.query.creatorUsername != null ? String(req.query.creatorUsername) : "";
    const data = await centralPrizeWithdrawalService.getAvailability(req.userId, creatorUsername);
    return res.json({ ok: true, ...data });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.json({ ok: true, dbRequired: true, availableBaht: 0, earnedBaht: 0, reservedBaht: 0 });
    }
    if (e.code === "NOT_FOUND") {
      return res.status(404).json({ ok: false, error: e.message });
    }
    if (e.code === "VALIDATION") {
      return res.status(400).json({ ok: false, error: e.message });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** ส่งคำขอถอนเงินรางวัลไปยังผู้สร้างเกม */
router.post("/central-prize-withdrawals", authMiddleware, async (req, res) => {
  try {
    const body = req.body || {};
    const rec = await centralPrizeWithdrawalService.createRequest({
      requesterUserId: req.userId,
      creatorUsername: body.creatorUsername,
      amountThb: body.amountThb,
      accountHolderName: body.accountHolderName,
      accountNumber: body.accountNumber,
      bankName: body.bankName
    });
    return res.json({ ok: true, withdrawal: rec });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.status(503).json({ ok: false, error: "ระบบฐานข้อมูลยังไม่พร้อม" });
    }
    if (e.code === "VALIDATION" || e.code === "INSUFFICIENT_BALANCE") {
      return res.status(400).json({ ok: false, error: e.message, code: e.code });
    }
    if (e.code === "NOT_FOUND") {
      return res.status(404).json({ ok: false, error: e.message });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.get("/central-prize-withdrawals/mine", authMiddleware, async (req, res) => {
  try {
    const list = await centralPrizeWithdrawalService.listForRequester(req.userId);
    return res.json({ ok: true, withdrawals: list });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.json({ ok: true, withdrawals: [], dbRequired: true });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** มีเกมส่วนกลางที่สร้างไว้หรือไม่ — แสดงเมนูผู้สร้าง */
router.get("/central-prize-withdrawals/creator-status", authMiddleware, async (req, res) => {
  try {
    const n = await centralPrizeWithdrawalService.countGamesCreatedBy(req.userId);
    return res.json({ ok: true, gamesCreatedCount: n, isGameCreator: n > 0 });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.json({ ok: true, gamesCreatedCount: 0, isGameCreator: false, dbRequired: true });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** คำขอถอนที่ส่งถึงผู้สร้างเกม (ฉัน) */
router.get("/central-prize-withdrawals/incoming", authMiddleware, async (req, res) => {
  try {
    const list = await centralPrizeWithdrawalService.listIncomingForCreator(req.userId);
    return res.json({ ok: true, withdrawals: list });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.json({ ok: true, withdrawals: [], dbRequired: true });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** ผู้ได้รับรางวัลจากเกมที่ฉันเป็นผู้สร้าง */
router.get("/central-prize-awards/incoming", authMiddleware, async (req, res) => {
  try {
    const limitRaw = req.query.limit != null ? Math.floor(Number(req.query.limit)) : 1000;
    const awards = await centralPrizeAwardService.listAwardsForCreator(req.userId, {
      limit: limitRaw
    });
    return res.json({ ok: true, awards });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.json({ ok: true, awards: [], dbRequired: true });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** ผู้สร้างเกมอัปเดตสถานะการส่งมอบรางวัลสิ่งของ */
router.post("/central-prize-awards/:id/item-resolve", authMiddleware, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!UUID_PARAM_RE.test(id)) {
      return res.status(400).json({ ok: false, error: "รูปแบบรหัสรางวัลไม่ถูกต้อง" });
    }
    await centralPrizeAwardService.resolveItemAwardByCreator({
      awardId: id,
      creatorUserId: req.userId,
      mode: req.body?.mode,
      status: req.body?.status,
      note: req.body?.note,
      trackingCode: req.body?.trackingCode
    });
    return res.json({ ok: true });
  } catch (e) {
    if (e.code === "NOT_FOUND") {
      return res.status(404).json({ ok: false, error: e.message });
    }
    if (e.code === "FORBIDDEN") {
      return res.status(403).json({ ok: false, error: e.message });
    }
    if (e.code === "VALIDATION") {
      return res.status(400).json({ ok: false, error: e.message });
    }
    if (e.code === "DB_REQUIRED") {
      return res.status(503).json({ ok: false, error: "ระบบฐานข้อมูลยังไม่พร้อม" });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** ผู้ขอถอนยกเลิกคำขอที่ยังรอ (pending) */
router.post("/central-prize-withdrawals/:id/cancel", authMiddleware, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!UUID_PARAM_RE.test(id)) {
      return res.status(400).json({ ok: false, error: "รูปแบบรหัสคำขอไม่ถูกต้อง" });
    }
    const rec = await centralPrizeWithdrawalService.cancelByRequester({
      withdrawalId: id,
      requesterUserId: req.userId
    });
    return res.json({ ok: true, withdrawal: rec });
  } catch (e) {
    if (e.code === "NOT_FOUND") {
      return res.status(404).json({ ok: false, error: e.message });
    }
    if (e.code === "DB_REQUIRED") {
      return res.status(503).json({ ok: false, error: "ระบบฐานข้อมูลยังไม่พร้อม" });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** ผู้สร้างเกมอนุมัติ/ปฏิเสธหลังจ่ายเงิน */
router.post("/central-prize-withdrawals/:id/resolve", authMiddleware, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!UUID_PARAM_RE.test(id)) {
      return res.status(400).json({ ok: false, error: "รูปแบบรหัสคำขอไม่ถูกต้อง" });
    }
    const action = req.body?.action;
    const note = req.body?.note;
    const rec = await centralPrizeWithdrawalService.resolveByCreator({
      withdrawalId: id,
      creatorUserId: req.userId,
      action,
      note,
      transferSlipUrl: req.body?.transferSlipUrl,
      transferDate: req.body?.transferDate
    });
    return res.json({ ok: true, withdrawal: rec });
  } catch (e) {
    if (e.code === "NOT_FOUND") {
      return res.status(404).json({ ok: false, error: e.message });
    }
    if (e.code === "FORBIDDEN") {
      return res.status(403).json({ ok: false, error: e.message });
    }
    if (e.code === "VALIDATION" || e.code === "CONFLICT") {
      return res.status(400).json({ ok: false, error: e.message });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = {
  router,
  authMiddleware,
  requireRole,
  optionalAuthMiddleware,
  signImpersonationToken,
  publicUserWithRoomGiftRed
};
