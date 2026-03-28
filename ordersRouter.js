const express = require("express");
const { authMiddleware } = require("./authRouter");
const orderService = require("./services/orderService");

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { totalPrice, heartsGranted, items } = req.body || {};
    const order = await orderService.createOrder(req.userId, {
      totalPrice,
      heartsGranted,
      items
    });
    return res.json({ ok: true, order });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.status(503).json({
        ok: false,
        error:
          "ระบบบันทึกออเดอร์ยังไม่พร้อมใช้งาน — ลองใหม่ภายหลังหรือติดต่อผู้ดูแลเว็บไซต์"
      });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const orders = await orderService.listOrdersByUserId(req.userId);
    return res.json({ ok: true, orders });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.status(503).json({
        ok: false,
        error:
          "ระบบบันทึกออเดอร์ยังไม่พร้อมใช้งาน — ลองใหม่ภายหลังหรือติดต่อผู้ดูแลเว็บไซต์"
      });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = { router };
