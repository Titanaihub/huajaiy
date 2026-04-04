const crypto = require("crypto");
const { getPool } = require("../db/pool");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
function metaHasGameCode(meta) {
  if (!meta || typeof meta !== "object") return false;
  const a = meta.gameCode != null ? String(meta.gameCode).trim() : "";
  const b = meta.game_code != null ? String(meta.game_code).trim() : "";
  return Boolean(a || b);
}

/** แถวเก่าไม่มี gameCode ใน meta — ดึงจาก central_games ตอนอ่านรายการ */
async function enrichEntriesWithCentralGameCodes(entries) {
  const ids = new Set();
  for (const e of entries) {
    if (e.kind !== "game_start" || !e.meta || typeof e.meta !== "object") continue;
    const gid = e.meta.gameId != null ? String(e.meta.gameId).trim() : "";
    if (!gid || !UUID_RE.test(gid) || metaHasGameCode(e.meta)) continue;
    ids.add(gid);
  }
  if (ids.size === 0) return entries;
  const pool = requirePool();
  const r = await pool.query(
    `SELECT id::text AS id, NULLIF(TRIM(game_code::text), '') AS gc
     FROM central_games WHERE id = ANY($1::uuid[])`,
    [[...ids]]
  );
  const map = new Map();
  for (const row of r.rows) {
    if (row.gc != null && String(row.gc).trim()) {
      map.set(String(row.id), String(row.gc).trim());
    }
  }
  return entries.map((e) => {
    if (e.kind !== "game_start" || !e.meta || typeof e.meta !== "object") return e;
    const gid = e.meta.gameId != null ? String(e.meta.gameId).trim() : "";
    if (!gid || metaHasGameCode(e.meta)) return e;
    const gc = map.get(gid);
    if (!gc) return e;
    return { ...e, meta: { ...e.meta, gameCode: gc } };
  });
}

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
  const rows = r.rows.map((row) => ({
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
  return enrichEntriesWithCentralGameCodes(rows);
}

/**
 * อัปเดต meta ของแถว game_start ที่ผูก playSessionId (เช่น ผลรอบหลังจบเกม)
 * @param {string} playSessionId
 * @param {Record<string, unknown>} patch
 */
async function mergeMetaJsonByPlaySession(playSessionId, patch) {
  if (!playSessionId || typeof patch !== "object" || patch == null) return 0;
  const pool = requirePool();
  const sid = String(playSessionId).trim().slice(0, 64);
  const r = await pool.query(
    `UPDATE heart_ledger
     SET meta = COALESCE(meta, '{}'::jsonb) || $2::jsonb
     WHERE kind = 'game_start' AND meta->>'playSessionId' = $1`,
    [sid, JSON.stringify(patch)]
  );
  return r.rowCount || 0;
}

module.exports = {
  insertWithClient,
  listForUser,
  mergeMetaJsonByPlaySession
};
