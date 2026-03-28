const express = require("express");
const { authMiddleware } = require("./authRouter");
const shopService = require("./services/shopService");
const productService = require("./services/productService");

const router = express.Router();

function isUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(id || "")
  );
}

async function requireShopAccess(req, res, shopId) {
  if (!isUuid(shopId)) {
    res.status(400).json({ ok: false, error: "รหัสร้านไม่ถูกต้อง" });
    return null;
  }
  const shop = await shopService.getById(shopId);
  if (!shop) {
    res.status(404).json({ ok: false, error: "ไม่พบร้าน" });
    return null;
  }
  if (!shopService.canManageShop(req.userId, shop, req.userRole)) {
    res.status(403).json({ ok: false, error: "ไม่มีสิทธิ์จัดการร้านนี้" });
    return null;
  }
  return shop;
}

router.get("/:shopId/products", authMiddleware, async (req, res) => {
  try {
    const shop = await requireShopAccess(req, res, req.params.shopId);
    if (!shop) return;
    const products = await productService.listForShopOwner(req.params.shopId);
    return res.json({ ok: true, products, shop });
  } catch (e) {
    if (e.code === "DB_REQUIRED") {
      return res.status(503).json({
        ok: false,
        error: "ฐานข้อมูลยังไม่พร้อม"
      });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.post("/:shopId/products", authMiddleware, async (req, res) => {
  try {
    const shop = await requireShopAccess(req, res, req.params.shopId);
    if (!shop) return;
    const product = await productService.createProduct(req.params.shopId, req.body || {});
    return res.json({ ok: true, product });
  } catch (e) {
    if (e.code === "VALIDATION") {
      return res.status(400).json({ ok: false, error: e.message });
    }
    if (e.code === "DB_REQUIRED") {
      return res.status(503).json({ ok: false, error: "ฐานข้อมูลยังไม่พร้อม" });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.patch("/:shopId/products/:productId", authMiddleware, async (req, res) => {
  try {
    const shop = await requireShopAccess(req, res, req.params.shopId);
    if (!shop) return;
    if (!isUuid(req.params.productId)) {
      return res.status(400).json({ ok: false, error: "รหัสสินค้าไม่ถูกต้อง" });
    }
    const product = await productService.updateProduct(
      req.params.shopId,
      req.params.productId,
      req.body || {}
    );
    return res.json({ ok: true, product });
  } catch (e) {
    if (e.code === "NOT_FOUND") {
      return res.status(404).json({ ok: false, error: e.message });
    }
    if (e.code === "VALIDATION") {
      return res.status(400).json({ ok: false, error: e.message });
    }
    if (e.code === "DB_REQUIRED") {
      return res.status(503).json({ ok: false, error: "ฐานข้อมูลยังไม่พร้อม" });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

router.delete("/:shopId/products/:productId", authMiddleware, async (req, res) => {
  try {
    const shop = await requireShopAccess(req, res, req.params.shopId);
    if (!shop) return;
    if (!isUuid(req.params.productId)) {
      return res.status(400).json({ ok: false, error: "รหัสสินค้าไม่ถูกต้อง" });
    }
    await productService.deleteProductSoft(req.params.shopId, req.params.productId);
    return res.json({ ok: true });
  } catch (e) {
    if (e.code === "NOT_FOUND") {
      return res.status(404).json({ ok: false, error: e.message });
    }
    if (e.code === "DB_REQUIRED") {
      return res.status(503).json({ ok: false, error: "ฐานข้อมูลยังไม่พร้อม" });
    }
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = { router };
