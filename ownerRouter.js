const express = require("express");
const { MEMBER } = require("./constants/roles");
const { authMiddleware, requireRole } = require("./authRouter");
const shopService = require("./services/shopService");

const router = express.Router();

/** สมาชิกล็อกอินทุกคน — รายการร้านตาม owner_user_id (ว่างได้) */
router.get("/ping", authMiddleware, requireRole(MEMBER, "owner", "admin"), (req, res) => {
  res.json({
    ok: true,
    message: "โครงระบบเจ้าของร้านทำงาน",
    role: req.userRole
  });
});

/** ร้านที่ผู้ใช้เป็นเจ้าของ (ตาราง shops) — ยังไม่มี DB คืน [] */
router.get(
  "/shops",
  authMiddleware,
  requireRole(MEMBER, "owner", "admin"),
  async (req, res) => {
    try {
      const shops = await shopService.listByOwner(req.userId);
      return res.json({ ok: true, shops });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }
);

module.exports = { router };
