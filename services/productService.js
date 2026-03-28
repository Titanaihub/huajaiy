const crypto = require("crypto");
const { getPool } = require("../db/pool");

function dbRequired() {
  const err = new Error("DB_REQUIRED");
  err.code = "DB_REQUIRED";
  throw err;
}

function mapPublicRow(row) {
  return {
    id: row.id,
    shopId: row.shop_id,
    shopName: row.shop_name,
    shopSlug: row.shop_slug,
    title: row.title,
    description: row.description || "",
    priceThb: row.price_thb,
    stockQty: row.stock_qty,
    category: row.category || "",
    imageUrl: row.image_url || null,
    heartsBonus: row.hearts_bonus ?? 0,
    createdAt: row.created_at
  };
}

function mapOwnerRow(row) {
  return {
    id: row.id,
    shopId: row.shop_id,
    title: row.title,
    description: row.description || "",
    priceThb: row.price_thb,
    stockQty: row.stock_qty,
    category: row.category || "",
    imageUrl: row.image_url || null,
    heartsBonus: row.hearts_bonus ?? 0,
    active: row.active,
    createdAt: row.created_at
  };
}

/** แคตตาล็อกสาธารณะ */
async function listPublic({
  q = "",
  category = "",
  shopId = "",
  limit = 24,
  offset = 0
} = {}) {
  const pool = getPool();
  if (!pool) dbRequired();

  const lim = Math.min(Math.max(Number(limit) || 24, 1), 48);
  const off = Math.max(Number(offset) || 0, 0);
  const search = String(q || "").trim().slice(0, 80);
  const cat = String(category || "").trim().slice(0, 64);
  const sid = String(shopId || "").trim();

  const cond = [`p.active = TRUE`];
  const args = [];
  let i = 1;

  if (search) {
    cond.push(`(p.title ILIKE $${i} OR COALESCE(p.description,'') ILIKE $${i})`);
    args.push(`%${search}%`);
    i++;
  }
  if (cat) {
    cond.push(`p.category = $${i}`);
    args.push(cat);
    i++;
  }
  if (sid && /^[0-9a-f-]{36}$/i.test(sid)) {
    cond.push(`p.shop_id = $${i}::uuid`);
    args.push(sid);
    i++;
  }

  const where = cond.join(" AND ");
  const countSql = `
    SELECT COUNT(*)::int AS n
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    WHERE ${where}
  `;
  const listSql = `
    SELECT p.id, p.shop_id, p.title, p.description, p.price_thb, p.stock_qty,
           p.category, p.image_url, p.hearts_bonus, p.created_at,
           s.name AS shop_name, s.slug AS shop_slug
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    WHERE ${where}
    ORDER BY p.created_at DESC
    LIMIT $${i} OFFSET $${i + 1}
  `;

  const cr = await pool.query(countSql, args);
  const total = cr.rows[0]?.n ?? 0;
  const lr = await pool.query(listSql, [...args, lim, off]);
  return {
    products: lr.rows.map(mapPublicRow),
    total,
    limit: lim,
    offset: off
  };
}

async function getPublicById(productId) {
  const pool = getPool();
  if (!pool) dbRequired();
  const r = await pool.query(
    `SELECT p.id, p.shop_id, p.title, p.description, p.price_thb, p.stock_qty,
            p.category, p.image_url, p.hearts_bonus, p.created_at,
            s.name AS shop_name, s.slug AS shop_slug
     FROM products p
     JOIN shops s ON s.id = p.shop_id
     WHERE p.id = $1 AND p.active = TRUE`,
    [productId]
  );
  if (!r.rows[0]) return null;
  return mapPublicRow(r.rows[0]);
}

async function resolveByIds(ids) {
  const pool = getPool();
  if (!pool) dbRequired();
  const uuids = [...new Set((ids || []).filter(Boolean))].slice(0, 50);
  if (uuids.length === 0) return [];
  const r = await pool.query(
    `SELECT p.id, p.shop_id, p.title, p.description, p.price_thb, p.stock_qty,
            p.category, p.image_url, p.hearts_bonus, p.created_at,
            s.name AS shop_name, s.slug AS shop_slug
     FROM products p
     JOIN shops s ON s.id = p.shop_id
     WHERE p.id = ANY($1::uuid[]) AND p.active = TRUE`,
    [uuids]
  );
  return r.rows.map(mapPublicRow);
}

async function listCategoriesPublic() {
  const pool = getPool();
  if (!pool) dbRequired();
  const r = await pool.query(
    `SELECT DISTINCT TRIM(category) AS c
     FROM products
     WHERE active = TRUE AND TRIM(COALESCE(category,'')) <> ''
     ORDER BY c ASC
     LIMIT 200`
  );
  return r.rows.map((x) => x.c).filter(Boolean);
}

async function listShopsWithProducts() {
  const pool = getPool();
  if (!pool) dbRequired();
  const r = await pool.query(`
    SELECT DISTINCT s.id, s.slug, s.name
    FROM shops s
    INNER JOIN products p ON p.shop_id = s.id AND p.active = TRUE
    ORDER BY s.name ASC
  `);
  return r.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name
  }));
}

async function listForShopOwner(shopId) {
  const pool = getPool();
  if (!pool) dbRequired();
  const r = await pool.query(
    `SELECT id, shop_id, title, description, price_thb, stock_qty, category,
            image_url, hearts_bonus, active, created_at
     FROM products
     WHERE shop_id = $1
     ORDER BY created_at DESC`,
    [shopId]
  );
  return r.rows.map(mapOwnerRow);
}

async function createProduct(shopId, body) {
  const pool = getPool();
  if (!pool) dbRequired();
  const title = String(body.title || "").trim().slice(0, 255);
  if (!title) {
    const e = new Error("กรุณากรอกชื่อสินค้า");
    e.code = "VALIDATION";
    throw e;
  }
  const description = body.description != null ? String(body.description).slice(0, 8000) : "";
  const priceThb = Math.max(0, Math.floor(Number(body.priceThb) || 0));
  const stockQty = Math.max(0, Math.floor(Number(body.stockQty) || 0));
  const category = String(body.category || "").trim().slice(0, 64);
  const imageUrl = body.imageUrl != null ? String(body.imageUrl).trim().slice(0, 2000) : null;
  const heartsBonus = Math.max(0, Math.floor(Number(body.heartsBonus) || 0));
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO products (id, shop_id, title, description, price_thb, stock_qty, category, image_url, hearts_bonus, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)`,
    [id, shopId, title, description, priceThb, stockQty, category, imageUrl, heartsBonus]
  );
  return getOwnerById(shopId, id);
}

async function getOwnerById(shopId, productId) {
  const pool = getPool();
  if (!pool) dbRequired();
  const r = await pool.query(
    `SELECT id, shop_id, title, description, price_thb, stock_qty, category,
            image_url, hearts_bonus, active, created_at
     FROM products
     WHERE id = $1 AND shop_id = $2`,
    [productId, shopId]
  );
  return r.rows[0] ? mapOwnerRow(r.rows[0]) : null;
}

async function updateProduct(shopId, productId, body) {
  const pool = getPool();
  if (!pool) dbRequired();
  const cur = await getOwnerById(shopId, productId);
  if (!cur) {
    const e = new Error("ไม่พบสินค้า");
    e.code = "NOT_FOUND";
    throw e;
  }
  const title =
    body.title !== undefined
      ? String(body.title).trim().slice(0, 255)
      : cur.title;
  if (!title) {
    const e = new Error("กรุณากรอกชื่อสินค้า");
    e.code = "VALIDATION";
    throw e;
  }
  const description =
    body.description !== undefined
      ? String(body.description).slice(0, 8000)
      : cur.description;
  const priceThb =
    body.priceThb !== undefined
      ? Math.max(0, Math.floor(Number(body.priceThb) || 0))
      : cur.priceThb;
  const stockQty =
    body.stockQty !== undefined
      ? Math.max(0, Math.floor(Number(body.stockQty) || 0))
      : cur.stockQty;
  const category =
    body.category !== undefined
      ? String(body.category).trim().slice(0, 64)
      : cur.category;
  const imageUrl =
    body.imageUrl !== undefined
      ? body.imageUrl
        ? String(body.imageUrl).trim().slice(0, 2000)
        : null
      : cur.imageUrl;
  const heartsBonus =
    body.heartsBonus !== undefined
      ? Math.max(0, Math.floor(Number(body.heartsBonus) || 0))
      : cur.heartsBonus;
  const active =
    body.active !== undefined ? Boolean(body.active) : cur.active;

  await pool.query(
    `UPDATE products SET
       title = $3, description = $4, price_thb = $5, stock_qty = $6,
       category = $7, image_url = $8, hearts_bonus = $9, active = $10
     WHERE id = $1 AND shop_id = $2`,
    [
      productId,
      shopId,
      title,
      description,
      priceThb,
      stockQty,
      category,
      imageUrl,
      heartsBonus,
      active
    ]
  );
  return getOwnerById(shopId, productId);
}

async function deleteProductSoft(shopId, productId) {
  const pool = getPool();
  if (!pool) dbRequired();
  const r = await pool.query(
    `UPDATE products SET active = FALSE WHERE id = $1 AND shop_id = $2 RETURNING id`,
    [productId, shopId]
  );
  if (!r.rows[0]) {
    const e = new Error("ไม่พบสินค้า");
    e.code = "NOT_FOUND";
    throw e;
  }
  return { ok: true };
}

/** ล็อกแถวสินค้าในทรานแซกชัน (ใช้คู่กับ client เดียวกัน) */
async function lockProductRow(client, productId) {
  const r = await client.query(
    `SELECT p.id, p.shop_id, p.title, p.price_thb, p.stock_qty, p.hearts_bonus,
            s.name AS shop_name
     FROM products p
     JOIN shops s ON s.id = p.shop_id
     WHERE p.id = $1 AND p.active = TRUE
     FOR UPDATE OF p`,
    [productId]
  );
  return r.rows[0] || null;
}

module.exports = {
  listPublic,
  getPublicById,
  resolveByIds,
  listCategoriesPublic,
  listShopsWithProducts,
  listForShopOwner,
  createProduct,
  updateProduct,
  deleteProductSoft,
  getOwnerById,
  lockProductRow
};
