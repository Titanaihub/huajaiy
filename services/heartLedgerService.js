const crypto = require("crypto");
const { getPool } = require("../db/pool");

function requirePool() {
  const pool = getPool();
  if (!pool) {
    const e = new Error("DB_REQUIRED");
    e.code = "DB_REQUIRED";
    throw e;
  }
  return pool;
}

/**
 * @param {import("pg").PoolClient} client
 * @param {{
 *   userId: string;
 *   pinkDelta: number;
 *   redDelta: number;
 *   pinkAfter: number;
 *   redAfter: number;
 *   kind: string;
 *   label?: string | null;
 *   meta?: Record<string, unknown> | null;
 * }} row
 */
async function insertWithClient(client, row) {
  const id = crypto.randomUUID();
  const metaVal =
    row.meta != null && typeof row.meta === "object" && !Array.isArray(row.meta)
      ? row.meta
      : null;
  await client.query(
    `INSERT INTO heart_ledger (
      id, user_id, pink_delta, red_delta, pink_balance_after, red_balance_after, kind, label, meta
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
    [
      id,
      row.userId,
      row.pinkDelta,
      row.redDelta,
      row.pinkAfter,
      row.redAfter,
      String(row.kind || "unknown").slice(0, 48),
      row.label != null ? String(row.label).slice(0, 500) : null,
      metaVal
    ]
  );
}

/**
 * @param {string} userId
 * @param {{ limit?: number; offset?: number }} opts
 */
async function listForUser(userId, opts = {}) {
  const pool = requirePool();
  const lim = Math.min(200, Math.max(1, Math.floor(Number(opts.limit) || 80)));
  const off = Math.max(0, Math.floor(Number(opts.offset) || 0));
  const r = await pool.query(
    `SELECT
       id,
       created_at AS "createdAt",
       pink_delta AS "pinkDelta",
       red_delta AS "redDelta",
       pink_balance_after AS "pinkBalanceAfter",
       red_balance_after AS "redBalanceAfter",
       kind,
       label,
       meta
     FROM heart_ledger
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, lim, off]
  );
  return r.rows.map((row) => ({
    id: String(row.id),
    createdAt: row.createdAt,
    pinkDelta: Math.floor(Number(row.pinkDelta) || 0),
    redDelta: Math.floor(Number(row.redDelta) || 0),
    pinkBalanceAfter: Math.max(0, Math.floor(Number(row.pinkBalanceAfter) || 0)),
    redBalanceAfter: Math.max(0, Math.floor(Number(row.redBalanceAfter) || 0)),
    kind: row.kind != null ? String(row.kind) : "",
    label: row.label != null ? String(row.label) : "",
    meta: row.meta && typeof row.meta === "object" ? row.meta : null
  }));
}

module.exports = {
  insertWithClient,
  listForUser
};
