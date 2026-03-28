const crypto = require("crypto");
const { getPool } = require("../db/pool");

function rowToPackage(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    pinkQty: Math.max(0, Math.floor(Number(row.pink_qty) || 0)),
    redQty: Math.max(0, Math.floor(Number(row.red_qty) || 0)),
    priceThb: Math.max(0, Math.floor(Number(row.price_thb) || 0)),
    active: Boolean(row.active),
    sortOrder: Math.floor(Number(row.sort_order) || 0),
    createdAt: row.created_at
  };
}

async function listActive() {
  const pool = getPool();
  if (!pool) {
    const err = new Error("DB_REQUIRED");
    err.code = "DB_REQUIRED";
    throw err;
  }
  const r = await pool.query(
    `SELECT * FROM heart_packages WHERE active = TRUE
     ORDER BY sort_order ASC, created_at ASC`
  );
  return r.rows.map(rowToPackage);
}

async function listAllAdmin() {
  const pool = getPool();
  if (!pool) {
    const err = new Error("DB_REQUIRED");
    err.code = "DB_REQUIRED";
    throw err;
  }
  const r = await pool.query(
    `SELECT * FROM heart_packages ORDER BY sort_order ASC, created_at DESC`
  );
  return r.rows.map(rowToPackage);
}

async function findById(id) {
  const pool = getPool();
  if (!pool) return null;
  const r = await pool.query(`SELECT * FROM heart_packages WHERE id = $1`, [id]);
  if (r.rows.length === 0) return null;
  return rowToPackage(r.rows[0]);
}

async function create({
  title,
  description = "",
  pinkQty = 0,
  redQty = 0,
  priceThb = 0,
  sortOrder = 0,
  active = true
}) {
  const pool = getPool();
  if (!pool) {
    const err = new Error("DB_REQUIRED");
    err.code = "DB_REQUIRED";
    throw err;
  }
  const id = crypto.randomUUID();
  const pq = Math.max(0, Math.floor(Number(pinkQty) || 0));
  const rq = Math.max(0, Math.floor(Number(redQty) || 0));
  const pr = Math.max(0, Math.floor(Number(priceThb) || 0));
  const so = Math.floor(Number(sortOrder) || 0);
  const t = String(title || "").trim().slice(0, 160);
  if (!t) {
    const e = new Error("ต้องมีชื่อแพ็กเกจ");
    e.code = "VALIDATION";
    throw e;
  }
  if (pq + rq <= 0) {
    const e = new Error("ต้องมีหัวใจชมพูหรือแดงอย่างน้อย 1");
    e.code = "VALIDATION";
    throw e;
  }
  const r = await pool.query(
    `INSERT INTO heart_packages (id, title, description, pink_qty, red_qty, price_thb, active, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [id, t, String(description || "").slice(0, 4000), pq, rq, pr, Boolean(active), so]
  );
  return rowToPackage(r.rows[0]);
}

async function update(id, patch) {
  const pool = getPool();
  if (!pool) {
    const err = new Error("DB_REQUIRED");
    err.code = "DB_REQUIRED";
    throw err;
  }
  const cur = await findById(id);
  if (!cur) return null;
  const title =
    patch.title != null ? String(patch.title).trim().slice(0, 160) : cur.title;
  const description =
    patch.description != null
      ? String(patch.description).slice(0, 4000)
      : cur.description;
  const pinkQty =
    patch.pinkQty != null
      ? Math.max(0, Math.floor(Number(patch.pinkQty) || 0))
      : cur.pinkQty;
  const redQty =
    patch.redQty != null
      ? Math.max(0, Math.floor(Number(patch.redQty) || 0))
      : cur.redQty;
  const priceThb =
    patch.priceThb != null
      ? Math.max(0, Math.floor(Number(patch.priceThb) || 0))
      : cur.priceThb;
  const sortOrder =
    patch.sortOrder != null
      ? Math.floor(Number(patch.sortOrder) || 0)
      : cur.sortOrder;
  const active = patch.active != null ? Boolean(patch.active) : cur.active;
  if (!title) {
    const e = new Error("ต้องมีชื่อแพ็กเกจ");
    e.code = "VALIDATION";
    throw e;
  }
  if (pinkQty + redQty <= 0) {
    const e = new Error("ต้องมีหัวใจชมพูหรือแดงอย่างน้อย 1");
    e.code = "VALIDATION";
    throw e;
  }
  const r = await pool.query(
    `UPDATE heart_packages SET
      title = $2, description = $3, pink_qty = $4, red_qty = $5,
      price_thb = $6, active = $7, sort_order = $8
    WHERE id = $1 RETURNING *`,
    [id, title, description, pinkQty, redQty, priceThb, active, sortOrder]
  );
  return rowToPackage(r.rows[0]);
}

module.exports = {
  listActive,
  listAllAdmin,
  findById,
  create,
  update
};
