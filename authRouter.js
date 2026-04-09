const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  validateRegisterBody,
  validateLoginBody,
  validateRegisterNames,
  validatePasswordChangeBody,
  validateNewPasswordOnlyBody
} = require("./authValidators");
const userService = require("./services/userService");
const phoneHistoryService = require("./services/phoneHistoryService");
const nameChangeRequestService = require("./services/nameChangeRequestService");
const shopService = require("./services/shopService");
const centralPrizeAwardService = require("./services/centralPrizeAwardService");
const centralPrizeWithdrawalService = require("./services/centralPrizeWithdrawalService");
const heartLedgerService = require("./services/heartLedgerService");
const roomRedGiftService = require("./services/roomRedGiftService");
const memberPublicPostService = require("./services/memberPublicPostService");
const memberPublicPostShareService = require("./services/memberPublicPostShareService");
const memberPublicPostShareRewardService = require("./services/memberPublicPostShareRewardService");
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

function timingSafeLineSecret(headerVal, envSecret) {
  const a = Buffer.from(String(headerVal || ""), "utf8");
  const b = Buffer.from(String(envSecret || ""), "utf8");
  if (a.length !== b.length || b.length < 16) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (s && String(s).length >= 16) return s;
  if (process.env.NODE_ENV === "test") {
    return "test-only-jwt-secret-should-not-be-used";
  }
  throw new Error("JWT_SECRET missing or too short (must be >= 16 chars)");
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

/** รวมยอดหัวใจแดงจากรหัสของห้อง (scoped) + มัดจำแชร์โพสต์ ให้สอดคล้องกับ GET /me */
async function publicUserWithRoomGiftRed(user) {
  const base = userService.publicUser(user);
  let roomGiftRed = [];
  try {
    roomGiftRed = await roomRedGiftService.listRoomGiftBalancesForUser(user.id);
  } catch (e) {
    /** อย่าให้ล็อกอิน LINE/ลงทะเบียนล้มเพราะตารางย่อย (เช่น user_room_red_balance ยังไม่ migrate) */
    if (e.code !== "DB_REQUIRED") {
      console.error("[publicUserWithRoomGiftRed] roomGiftRed skipped:", e.message);
    }
  }
  let shareRewardGiveawayEscrow = 0;
  let shareRewardWalletEscrow = 0;
  let shareRewardActivePosts = [];
  try {
    const s = await memberPublicPostShareRewardService.sumActiveShareEscrowForUser(user.id);
    shareRewardGiveawayEscrow = Math.max(0, Math.floor(Number(s.giveawayPool) || 0));
    shareRewardWalletEscrow = Math.max(0, Math.floor(Number(s.walletPool) || 0));
    shareRewardActivePosts =
      await memberPublicPostShareRewardService.listActiveShareCampaignsForUser(user.id);
  } catch (e) {
    if (e.code !== "DB_REQUIRED") {
      console.error("[publicUserWithRoomGiftRed] share escrow skipped:", e.message);
    }
  }
  return {
    ...base,
    roomGiftRed,
    shareRewardGiveawayEscrow,
    shareRewardWalletEscrow,
    shareRewardActivePosts
  };
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

/**
 * อ่าน Bearer จากคำขอแบบไม่บังคับ — ใช้กับ API สาธารณะที่ให้เจ้าของเพจเห็นก่อนเผยแพร่
 * @returns {Promise<{ kind: "none" } | { kind: "user", user: object } | { kind: "reject", status: number, error: string, code?: string }>}
 */
async function tryResolveBearerUser(req) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) {
    return { kind: "none" };
  }
  const token = h.slice("Bearer ".length).trim();
  if (!token) return { kind: "none" };
  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch {
    return {
      kind: "reject",
      status: 401,
      error: "โทเค็นไม่ถูกต้องหรือหมดอายุ"
    };
  }
  try {
    const user = await userService.findById(payload.sub);
    if (!user) {
      return { kind: "reject", status: 401, error: "ไม่พบบัญชี" };
    }
    if (user.accountDisabled) {
      return {
        kind: "reject",
        status: 403,
        error: "บัญชีนี้ถูกระงับการใช้งาน",
        code: "ACCOUNT_DISABLED"
      };
    }
    return { kind: "user", user };
  } catch (e) {
    return { kind: "reject", status: 500, error: e.message };
  }
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
    if (process.env.ALLOW_PUBLIC_REGISTER !== "1") {
      return res.status(403).json({
        ok: false,
        error:
          "ปิดการสมัครสมาชิกแบบฟอร์มแล้ว — กรุณาเข้าสู่ระบบด้วย LINE ที่เว็บไซต์"
      });
    }
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

/**
 * แลก LINE identity เป็น JWT สมาชิก — เรียกได้เฉพาะจากเว็บ (Next) ที่ส่ง X-HUAJAIY-Line-Link-Secret ตรงกับ LINE_LINK_SECRET
 * รองรับ body แบบเก่า: line_user_id, display_name, picture_url (เส้นทาง /api/v1/member/login-line)
 */
async function postLoginLine(req, res) {
  try {
    const secret = process.env.LINE_LINK_SECRET;
    if (!secret || String(secret).length < 16) {
      return res.status(503).json({
        ok: false,
        error: "เซิร์ฟเวอร์ยังไม่ตั้ง LINE_LINK_SECRET"
      });
    }
    const hdr = req.headers["x-huajaiy-line-link-secret"];
    if (!timingSafeLineSecret(hdr, secret)) {
      return res.status(403).json({
        ok: false,
        error: "ไม่มีสิทธิ์เรียก endpoint นี้"
      });
    }

    const b = req.body && typeof req.body === "object" ? req.body : {};
    const lineUserId = String(
      b.lineUserId || b.line_user_id || ""
    ).trim();
    const displayName = String(
      b.displayName || b.display_name || ""
    ).trim().slice(0, 100);
    const pictureUrlRaw =
      b.pictureUrl != null
        ? b.pictureUrl
        : b.picture_url != null
          ? b.picture_url
          : null;
    const pictureUrl =
      pictureUrlRaw != null ? String(pictureUrlRaw) : null;

    if (!lineUserId) {
      return res.status(400).json({ ok: false, error: "ไม่มี LINE user id" });
    }

    let user = await userService.findByLineUserId(lineUserId);
    if (!user) {
      try {
        user = await userService.createUserFromLine({
          lineUserId,
          displayName: displayName || undefined,
          registrationIp: clientIp(req),
          pictureUrl
        });
      } catch (e) {
        if (e.code === "INVALID_LINE_USER") {
          return res.status(400).json({ ok: false, error: e.message });
        }
        if (e.code === "DB_REQUIRED") {
          return res.status(503).json({ ok: false, error: e.message });
        }
        console.error("[login-line] createUserFromLine:", e);
        throw e;
      }
    }

    if (!user) {
      return res.status(500).json({ ok: false, error: "สร้างบัญชีไม่สำเร็จ" });
    }
    try {
      const picSynced = await userService.syncLinePictureFromLine(
        user.id,
        pictureUrl
      );
      if (picSynced) {
        user = picSynced;
      }
    } catch (e) {
      console.error("[login-line] syncLinePictureFromLine:", e.message);
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
      user: await publicUserWithRoomGiftRed(user),
      ...capabilitiesPayloadForUser(user)
    });
  } catch (e) {
    console.error("[login-line]", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}

router.post("/login-line", postLoginLine);

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
    const cur = await userService.findById(req.userId);
    if (!cur) {
      return res.status(404).json({ ok: false, error: "ไม่พบบัญชี" });
    }
    const parsed = validateProfilePatch(req.body || {}, {
      countryCode: cur.countryCode || "TH",
      selfServiceNameEditsUsed: cur.selfServiceNameEdits || 0,
      currentFirstName: cur.firstName,
      currentLastName: cur.lastName
    });
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
    if (e.code === "USERNAME_TAKEN" || e.code === "EMAIL_TAKEN") {
      return res.status(400).json({ ok: false, error: e.message });
    }
    if (e.code === "NAME_EDIT_LIMIT") {
      return res.status(400).json({ ok: false, error: e.message });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * สมาชิกเปลี่ยนรหัสผ่าน — ห้ามใช้ขณะแอดมินดูในนามสมาชิก
 * - มีรหัสเดิม: ส่ง currentPassword + newPassword + newPasswordConfirm
 * - บัญชีผูก LINE (ยังไม่เคยตั้งรหัสที่จำได้): ไม่ส่ง currentPassword ได้ — ตั้ง newPassword + newPasswordConfirm อย่างเดียว
 */
router.patch("/password", authMiddleware, async (req, res) => {
  try {
    if (req.impersonation && req.impersonation.adminUserId) {
      return res.status(403).json({
        ok: false,
        error:
          "ไม่สามารถเปลี่ยนรหัสผ่านขณะดูในนามสมาชิก — ออกจากโหมดดูก่อน"
      });
    }
    const user = await userService.findById(req.userId);
    if (!user || !user.passwordHash) {
      return res.status(404).json({ ok: false, error: "ไม่พบบัญชี" });
    }
    const body = req.body || {};
    const rawCurrent = String(body.currentPassword ?? "").trim();
    const lineLinked =
      user.lineUserId != null && String(user.lineUserId).trim() !== "";

    let newPassword;
    if (rawCurrent.length > 0) {
      const parsed = validatePasswordChangeBody(body);
      if (!parsed.ok) {
        return res.status(400).json({ ok: false, error: parsed.error });
      }
      if (!bcrypt.compareSync(parsed.data.currentPassword, user.passwordHash)) {
        return res.status(400).json({
          ok: false,
          error: "รหัสผ่านปัจจุบันไม่ถูกต้อง"
        });
      }
      newPassword = parsed.data.newPassword;
    } else if (lineLinked) {
      const parsed = validateNewPasswordOnlyBody(body);
      if (!parsed.ok) {
        return res.status(400).json({ ok: false, error: parsed.error });
      }
      newPassword = parsed.data.newPassword;
    } else {
      return res.status(400).json({
        ok: false,
        error: "กรุณากรอกรหัสผ่านปัจจุบัน"
      });
    }

    if (bcrypt.compareSync(newPassword, user.passwordHash)) {
      return res.status(400).json({
        ok: false,
        error: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม"
      });
    }
    await userService.setPasswordHashOnly(
      req.userId,
      bcrypt.hashSync(newPassword, 10)
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

/** โพสต์เพจสาธารณะของฉัน — เรียงตาม sort_order */
router.get("/my-public-posts", authMiddleware, async (req, res) => {
  try {
    const posts = await memberPublicPostService.listByUserId(req.userId);
    return res.json({ ok: true, posts });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.json({ ok: true, posts: [], dbRequired: true });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.post("/my-public-posts", authMiddleware, async (req, res) => {
  try {
    const b = req.body && typeof req.body === "object" ? req.body : {};
    const post = await memberPublicPostService.createForUser(req.userId, {
      title: b.title,
      coverImageUrl: b.coverImageUrl,
      bodyBlocks: b.bodyBlocks,
      layout: b.layout,
      sortOrder: b.sortOrder
    });
    return res.json({ ok: true, post });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.status(503).json({ ok: false, error: e.message });
    }
    if (e.code === "VALIDATION") {
      return res.status(400).json({ ok: false, error: e.message });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.patch("/my-public-posts/:id", authMiddleware, async (req, res) => {
  try {
    const b = req.body && typeof req.body === "object" ? req.body : {};
    const patch = {};
    if (Object.prototype.hasOwnProperty.call(b, "title")) patch.title = b.title;
    if (Object.prototype.hasOwnProperty.call(b, "coverImageUrl")) {
      patch.coverImageUrl = b.coverImageUrl;
    }
    if (Object.prototype.hasOwnProperty.call(b, "bodyBlocks")) {
      patch.bodyBlocks = b.bodyBlocks;
    }
    if (Object.prototype.hasOwnProperty.call(b, "layout")) patch.layout = b.layout;
    if (Object.prototype.hasOwnProperty.call(b, "sortOrder")) {
      patch.sortOrder = b.sortOrder;
    }
    const post = await memberPublicPostService.updateForUser(
      req.userId,
      req.params.id,
      patch
    );
    return res.json({ ok: true, post });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.status(503).json({ ok: false, error: e.message });
    }
    if (e.code === "VALIDATION") {
      return res.status(400).json({ ok: false, error: e.message });
    }
    if (e.code === "NOT_FOUND" || e.code === "FORBIDDEN") {
      return res.status(e.code === "FORBIDDEN" ? 403 : 404).json({
        ok: false,
        error: e.message
      });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.delete("/my-public-posts/:id", authMiddleware, async (req, res) => {
  try {
    await memberPublicPostService.deleteForUser(req.userId, req.params.id);
    return res.json({ ok: true });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.status(503).json({ ok: false, error: e.message });
    }
    if (e.code === "VALIDATION" || e.code === "NOT_FOUND") {
      return res.status(e.code === "NOT_FOUND" ? 404 : 400).json({
        ok: false,
        error: e.message
      });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** บันทึกว่าสมาชิกกดแชร์จากปุ่มบนเว็บ (ไลน์/เฟสบุ๊ก/คัดลอกลิงก์) */
router.post("/my-public-posts/:id/share-intent", authMiddleware, async (req, res) => {
  try {
    const b = req.body && typeof req.body === "object" ? req.body : {};
    const channel = String(b.channel || "").trim();
    const result = await memberPublicPostShareService.recordShareIntent(
      req.userId,
      req.params.id,
      channel
    );
    return res.json({
      ok: true,
      shareReward: result.shareReward || { granted: false }
    });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.status(503).json({ ok: false, error: e.message });
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

/** สถิติแชร์/คลิกลิงก์อ้างอิง — เฉพาะเจ้าของโพสต์ */
router.get("/my-public-posts/:id/share-stats", authMiddleware, async (req, res) => {
  try {
    const stats = await memberPublicPostShareService.getShareStatsForPostOwner(
      req.userId,
      req.params.id
    );
    return res.json({ ok: true, ...stats });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.json({
        ok: true,
        intents: [],
        refClicksByUser: [],
        totalRefClicks: 0,
        shareIntentTotal: 0,
        shareIntentAnonymous: 0,
        shareIntentIdentified: 0,
        dbRequired: true
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

/** เริ่มแคมเปญแจกหัวใจแดงเมื่อแชร์ (กันวงเงินจากเจ้าของโพสต์) */
router.post("/my-public-posts/:id/share-reward/start", authMiddleware, async (req, res) => {
  try {
    const b = req.body && typeof req.body === "object" ? req.body : {};
    const post = await memberPublicPostShareRewardService.startCampaign(
      req.userId,
      req.params.id,
      b.redPerMember,
      b.redBudget
    );
    return res.json({ ok: true, post });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.status(503).json({ ok: false, error: e.message });
    }
    if (e.code === "VALIDATION") {
      return res.status(400).json({ ok: false, error: e.message });
    }
    if (e.code === "INSUFFICIENT_HEARTS") {
      return res.status(400).json({ ok: false, error: e.message });
    }
    if (e.code === "CONFLICT") {
      return res.status(409).json({ ok: false, error: e.message });
    }
    if (e.code === "NOT_FOUND" || e.code === "FORBIDDEN") {
      return res.status(e.code === "FORBIDDEN" ? 403 : 404).json({
        ok: false,
        error: e.message
      });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** ระงับแคมเปญแจกหัวใจแดง — คืนวงเงินที่เหลือให้เจ้าของโพสต์ */
router.post("/my-public-posts/:id/share-reward/pause", authMiddleware, async (req, res) => {
  try {
    const post = await memberPublicPostShareRewardService.pauseCampaign(
      req.userId,
      req.params.id
    );
    return res.json({ ok: true, post });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.status(503).json({ ok: false, error: e.message });
    }
    if (e.code === "VALIDATION") {
      return res.status(400).json({ ok: false, error: e.message });
    }
    if (e.code === "NOT_FOUND" || e.code === "FORBIDDEN") {
      return res.status(e.code === "FORBIDDEN" ? 403 : 404).json({
        ok: false,
        error: e.message
      });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** ประวัติได้รับ/หักหัวใจชมพู–แดง (ฐานข้อมูล) */
router.get("/heart-ledger/mine", authMiddleware, async (req, res) => {
  try {
    const q = req.query || {};
    const pinkOnly =
      q.pinkOnly === "1" ||
      q.pinkOnly === "true" ||
      String(q.scope || "").toLowerCase() === "pink";
    const limit = q.limit != null ? Number(q.limit) : pinkOnly ? 400 : 80;
    const offset = q.offset != null ? Number(q.offset) : 0;
    const entries = await heartLedgerService.listForUser(req.userId, {
      limit,
      offset,
      pinkOnly
    });
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

/**
 * ประวัติแดงห้องต่อเจ้าของห้อง — รวม redemption + game_start จาก DB คำนวณคงเหลือให้ตรงยอดจริง
 */
router.get("/room-red-room-timeline/mine", authMiddleware, async (req, res) => {
  try {
    const data = await roomRedGiftService.listRoomRedRoomTimelineForRedeemer(req.userId);
    return res.json({ ok: true, ...data });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.json({
        ok: true,
        rooms: [],
        historyIncomplete: false,
        dbRequired: true
      });
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
    const rawPickup = body.pickupCashHandoff;
    const pickupCashHandoff =
      rawPickup === true ||
      rawPickup === 1 ||
      String(rawPickup || "").toLowerCase() === "true";
    const rec = await centralPrizeWithdrawalService.createRequest({
      requesterUserId: req.userId,
      creatorUsername: body.creatorUsername,
      amountThb: body.amountThb,
      accountHolderName: body.accountHolderName,
      accountNumber: body.accountNumber,
      bankName: body.bankName,
      pickupCashHandoff,
      requesterNote: body.requesterNote
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

/** ผู้ชนะกดยืนยันรับรางวัลแบบมารับเอง — บันทึกเวลาให้ผู้สร้างเกมเห็น */
router.post("/central-prize-awards/:id/winner-pickup-ack", authMiddleware, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!UUID_PARAM_RE.test(id)) {
      return res.status(400).json({ ok: false, error: "รูปแบบรหัสรางวัลไม่ถูกต้อง" });
    }
    const result = await centralPrizeAwardService.acknowledgeWinnerPickupByWinner({
      awardId: id,
      winnerUserId: req.userId
    });
    return res.json({ ok: true, ...result });
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
  tryResolveBearerUser,
  signImpersonationToken,
  publicUserWithRoomGiftRed,
  postLoginLine
};
