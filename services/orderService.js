const crypto = require("crypto");
const { getPool } = require("../db/pool");
const productService = require("./productService");
const heartLedgerService = require("./heartLedgerService");

async function createOrder(userId, { totalPrice, heartsGranted, items }) {
  const pool = getPool();
  if (!pool) {
    const err = new Error("DB_REQUIRED");
    err.code = "DB_REQUIRED";
    throw err;
  }
  const id = crypto.randomUUID();
  const price = Math.max(0, Math.floor(Number(totalPrice) || 0));
  const hearts = Math.max(0, Math.floor(Number(heartsGranted) || 0));
  const payload = Array.isArray(items) ? items : [];

  const r = await pool.query(
    `INSERT INTO orders (id, user_id, total_price, hearts_granted, items, status)
     VALUES ($1, $2, $3, $4, $5::jsonb, 'demo_completed')
     RETURNING id, total_price, hearts_granted, items, status, created_at`,
    [id, userId, price, hearts, payload]
  );
  const row = r.rows[0];
  return {
    id: row.id,
    totalPrice: row.total_price,
    heartsGranted: row.hearts_granted,
    items: row.items,
    status: row.status,
    createdAt: row.created_at
  };
}

/**
 * ออเดอร์มาร์เก็ตเพลส: คำนวณยอดและตัดสต็อกในทรานแซกชัน · สถานะรอชำระเงิน
 * @param {string} userId
 * @param {{ lines: { productId: string, qty: number }[], shippingAddress: string }} payload
 */
async function createMarketplaceOrder(userId, payload) {
  const pool = getPool();
  if (!pool) {
    const err = new Error("DB_REQUIRED");
    err.code = "DB_REQUIRED";
    throw err;
  }
  const linesIn = Array.isArray(payload.lines) ? payload.lines : [];
  const shipping = String(payload.shippingAddress || "").trim();
  if (linesIn.length === 0) {
    const e = new Error("ตะกร้าว่าง");
    e.code = "VALIDATION";
    throw e;
  }
  if (shipping.length < 10) {
    const e = new Error("กรุณากรอกที่อยู่จัดส่งให้ครบ (อย่างน้อย 10 ตัวอักษร)");
    e.code = "VALIDATION";
    throw e;
  }

  const merged = new Map();
  for (const raw of linesIn) {
    const productId = raw && raw.productId;
    const qty = Math.max(1, Math.floor(Number(raw.qty) || 0));
    if (!productId || typeof productId !== "string") continue;
    merged.set(productId, (merged.get(productId) || 0) + qty);
  }
  const normalized = [...merged.entries()].map(([productId, qty]) => ({
    productId,
    qty
  }));
  if (normalized.length === 0) {
    const e = new Error("ไม่มีรายการสินค้าที่ถูกต้อง");
    e.code = "VALIDATION";
    throw e;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const items = [];
    let totalPrice = 0;
    let heartsGranted = 0;

    for (const { productId, qty } of normalized) {
      const row = await productService.lockProductRow(client, productId);
      if (!row) {
        const e = new Error(`ไม่พบสินค้า: ${productId}`);
        e.code = "NOT_FOUND";
        throw e;
      }
      if (row.stock_qty < qty) {
        const e = new Error(`สินค้า「${row.title}」คงเหลือไม่พอ (เหลือ ${row.stock_qty})`);
        e.code = "STOCK";
        throw e;
      }
      const lineSubtotal = row.price_thb * qty;
      const hb = (row.hearts_bonus || 0) * qty;
      totalPrice += lineSubtotal;
      heartsGranted += hb;
      items.push({
        name: row.title,
        qty,
        lineSubtotal,
        productId: row.id,
        shopId: row.shop_id,
        shopName: row.shop_name,
        hearts: hb
      });
      const upd = await client.query(
        `UPDATE products SET stock_qty = stock_qty - $2 WHERE id = $1 AND stock_qty >= $2`,
        [productId, qty]
      );
      if (upd.rowCount !== 1) {
        const e = new Error(`สต็อก「${row.title}» ไม่พอ`);
        e.code = "STOCK";
        throw e;
      }
    }

    const id = crypto.randomUUID();
    await client.query(
      `INSERT INTO orders (id, user_id, total_price, hearts_granted, items, status, shipping_snapshot, order_kind)
       VALUES ($1, $2, $3, $4, $5::jsonb, 'pending_payment', $6, 'marketplace')`,
      [id, userId, totalPrice, heartsGranted, JSON.stringify(items), shipping]
    );

    if (heartsGranted > 0) {
      const balR = await client.query(
        `UPDATE users SET
          pink_hearts_balance = GREATEST(0, COALESCE(pink_hearts_balance, 0) + $2),
          hearts_balance =
            GREATEST(0, COALESCE(pink_hearts_balance, 0) + $2) +
            GREATEST(0, COALESCE(red_hearts_balance, 0)) +
            COALESCE(red_giveaway_balance, 0)
        WHERE id = $1
        RETURNING pink_hearts_balance, red_hearts_balance`,
        [userId, heartsGranted]
      );
      if (balR.rows.length > 0) {
        const lineNames = items
          .filter((it) => (Number(it.hearts) || 0) > 0)
          .map((it) => it.name)
          .slice(0, 5);
        const shopNames = [...new Set(items.map((it) => it.shopName).filter(Boolean))].slice(0, 3);
        await heartLedgerService.insertWithClient(client, {
          userId,
          pinkDelta: heartsGranted,
          redDelta: 0,
          pinkAfter: Math.max(0, Math.floor(Number(balR.rows[0].pink_hearts_balance) || 0)),
          redAfter: Math.max(0, Math.floor(Number(balR.rows[0].red_hearts_balance) || 0)),
          kind: "marketplace_order",
          label:
            shopNames.length > 0
              ? `ได้รับหัวใจจากสั่งซื้อร้าน (${shopNames.join(", ")})`
              : "ได้รับหัวใจจากสั่งซื้อสินค้า",
          meta: {
            orderId: id,
            heartsGranted,
            productTitles: lineNames,
            shopNames
          }
        });
      }
    }

    await client.query("COMMIT");

    const r = await pool.query(
      `SELECT id, total_price, hearts_granted, items, status, created_at,
              shipping_snapshot, order_kind
       FROM orders WHERE id = $1`,
      [id]
    );
    const row = r.rows[0];
    return mapOrderRow(row);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

function mapOrderRow(row) {
  return {
    id: row.id,
    totalPrice: row.total_price,
    heartsGranted: row.hearts_granted,
    items: row.items,
    status: row.status,
    createdAt: row.created_at,
    shippingSnapshot: row.shipping_snapshot ?? null,
    orderKind: row.order_kind ?? "legacy"
  };
}

async function listOrdersByUserId(userId, limit = 50) {
  const pool = getPool();
  if (!pool) {
    const err = new Error("DB_REQUIRED");
    err.code = "DB_REQUIRED";
    throw err;
  }
  const r = await pool.query(
    `SELECT id, total_price, hearts_granted, items, status, created_at,
            shipping_snapshot, order_kind
     FROM orders
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return r.rows.map(mapOrderRow);
}

module.exports = {
  createOrder,
  createMarketplaceOrder,
  listOrdersByUserId
};
