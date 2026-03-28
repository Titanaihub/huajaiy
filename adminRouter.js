const express = require("express");
const { authMiddleware, requireRole } = require("./authRouter");
const userService = require("./services/userService");
const nameChangeRequestService = require("./services/nameChangeRequestService");

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
