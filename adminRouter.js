const express = require("express");
const { authMiddleware, requireRole } = require("./authRouter");

const router = express.Router();

/** ตรวจว่าโทเค็นเป็นบทบาทแอดมิน — ใช้ทดสอบหลังตั้ง role ในฐานข้อมูล */
router.get("/ping", authMiddleware, requireRole("admin"), (req, res) => {
  res.json({
    ok: true,
    message: "โครงระบบแอดมินทำงาน",
    role: req.userRole
  });
});

module.exports = { router };
