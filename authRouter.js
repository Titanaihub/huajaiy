const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  validateRegisterBody,
  validateLoginBody
} = require("./authValidators");
const userService = require("./services/userService");
const { MEMBER } = require("./constants/roles");

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
  req.userId = payload.sub;
  try {
    const user = await userService.findById(req.userId);
    if (!user) {
      return res.status(401).json({ ok: false, error: "ไม่พบบัญชี" });
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

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const parsed = validateRegisterBody(req.body || {});
    if (!parsed.ok) {
      return res.status(400).json({ ok: false, error: parsed.error });
    }
    const { firstName, lastName, phone, username, password } = parsed.data;
    const passwordHash = bcrypt.hashSync(password, 10);
    const user = await userService.createUser({
      username,
      passwordHash,
      firstName,
      lastName,
      phone
    });
    const token = signToken(user);
    return res.json({
      ok: true,
      token,
      user: userService.publicUser(user)
    });
  } catch (e) {
    if (e.code === "USERNAME_TAKEN") {
      return res.status(400).json({ ok: false, error: "ชื่อผู้ใช้นี้ถูกใช้แล้ว" });
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
    const token = signToken(user);
    return res.json({
      ok: true,
      token,
      user: userService.publicUser(user)
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
    return res.json({ ok: true, user: userService.publicUser(user) });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = { router, authMiddleware, requireRole };
