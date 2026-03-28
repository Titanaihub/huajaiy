const express = require("express");
const bcrypt = require("bcryptjs");
const { authMiddleware, requireRole } = require("./authRouter");
const { validatePassword } = require("./authValidators");
const userService = require("./services/userService");
const nameChangeRequestService = require("./services/nameChangeRequestService");
const orderService = require("./services/orderService");
const shopService = require("./services/shopService");
const { getAdminSnapshot } = require("./gameSession");

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
          "ยอด hearts_balance อยู่บนเซิร์ฟเวอร์ — หัวใจในเบราว์เซอร์ (localStorage) เป็นคนละกระเป๋า จนกว่าจะผูกกับ API"
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
      const delta = req.body?.delta != null ? Number(req.body.delta) : NaN;
      if (!Number.isFinite(delta) || Math.floor(delta) !== delta) {
        return res.status(400).json({
          ok: false,
          error: "ส่ง delta เป็นจำนวนเต็ม (บวกเพิ่ม ลบลด)"
        });
      }
      if (delta === 0) {
        return res.status(400).json({ ok: false, error: "delta ต้องไม่เป็น 0" });
      }
      if (Math.abs(delta) > 1_000_000) {
        return res.status(400).json({ ok: false, error: "delta ใหญ่เกินไป" });
      }
      const u = await userService.findById(id);
      if (!u) {
        return res.status(404).json({ ok: false, error: "ไม่พบสมาชิก" });
      }
      const updated = await userService.adjustHeartsBalance(id, delta);
      return res.json({
        ok: true,
        user: userService.adminMemberDetail(updated)
      });
    } catch (e) {
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

/** เกมพลิกการ์ด — รางวัลจากโค้ด + สถานะ session ในหน่วยความจำ */
router.get("/game", authMiddleware, requireRole("admin"), (_req, res) => {
  try {
    const heartCost = Number(process.env.GAME_HEART_COST || 0);
    const snap = getAdminSnapshot();
    return res.json({
      ok: true,
      heartCost,
      ...snap,
      persistenceNote:
        "รอบเกมอยู่ในหน่วยความจำของเซิร์ฟเวอร์ — หลัง redeploy หรือรีสตาร์ท session จะหาย · ยังไม่มีตารางบันทึกผู้ชนะหรือรางวัลต่อสมาชิกในฐานข้อมูล"
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

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
