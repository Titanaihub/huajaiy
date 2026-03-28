const express = require("express");
const productService = require("./services/productService");

const router = express.Router();

function sendDbRequired(res) {
  return res.status(503).json({
    ok: false,
    error: "ฐานข้อมูลยังไม่พร้อม — ตั้ง DATABASE_URL แล้วรีสตาร์ท API"
  });
}

router.get("/products", async (req, res) => {
  try {
    const q = req.query.q != null ? String(req.query.q) : "";
    const category = req.query.category != null ? String(req.query.category) : "";
    const shopId = req.query.shopId != null ? String(req.query.shopId) : "";
    const limit = req.query.limit != null ? Number(req.query.limit) : 24;
    const offset = req.query.offset != null ? Number(req.query.offset) : 0;
    const result = await productService.listPublic({ q, category, shopId, limit, offset });
    return res.json({ ok: true, ...result });
  } catch (e) {
    if (e.code === "DB_REQUIRED") return sendDbRequired(res);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.get("/products/resolve", async (req, res) => {
  try {
    const raw = String(req.query.ids || "");
    const ids = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 50);
    const products = await productService.resolveByIds(ids);
    return res.json({ ok: true, products });
  } catch (e) {
    if (e.code === "DB_REQUIRED") return sendDbRequired(res);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const id = String(req.params.id || "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return res.status(400).json({ ok: false, error: "รหัสสินค้าไม่ถูกต้อง" });
    }
    const product = await productService.getPublicById(id);
    if (!product) {
      return res.status(404).json({ ok: false, error: "ไม่พบสินค้า" });
    }
    return res.json({ ok: true, product });
  } catch (e) {
    if (e.code === "DB_REQUIRED") return sendDbRequired(res);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.get("/categories", async (_req, res) => {
  try {
    const categories = await productService.listCategoriesPublic();
    return res.json({ ok: true, categories });
  } catch (e) {
    if (e.code === "DB_REQUIRED") return sendDbRequired(res);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.get("/shops", async (_req, res) => {
  try {
    const shops = await productService.listShopsWithProducts();
    return res.json({ ok: true, shops });
  } catch (e) {
    if (e.code === "DB_REQUIRED") return sendDbRequired(res);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = { router };
