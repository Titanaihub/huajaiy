const crypto = require("crypto");
const { getPool } = require("../db/pool");

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

async function listOrdersByUserId(userId, limit = 50) {
  const pool = getPool();
  if (!pool) {
    const err = new Error("DB_REQUIRED");
    err.code = "DB_REQUIRED";
    throw err;
  }
  const r = await pool.query(
    `SELECT id, total_price, hearts_granted, items, status, created_at
     FROM orders
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return r.rows.map((row) => ({
    id: row.id,
    totalPrice: row.total_price,
    heartsGranted: row.hearts_granted,
    items: row.items,
    status: row.status,
    createdAt: row.created_at
  }));
}

module.exports = {
  createOrder,
  listOrdersByUserId
};
