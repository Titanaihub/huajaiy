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
 * @param {{ limit?: number; offset?: number; pinkOnly?: boolean }} opts
 * @param {boolean} [opts.pinkOnly] ถ้า true ดึงเฉพาะแถวที่หัวใจชมพูมีการเพิ่ม/หัก — ไม่ถูกรายการแดงล้นทับ limit
 */
function metaHasGameCode(meta) {
  if (!meta || typeof meta !== "object") return false;
  const a = meta.gameCode != null ? String(meta.gameCode).trim() : "";
  const b = meta.game_code != null ? String(meta.game_code).trim() : "";
  return Boolean(a || b);
}

function metaHasRoundOutcome(meta) {
  if (!meta || typeof meta !== "object") return false;
  const o =
    meta.roundOutcome != null
      ? String(meta.roundOutcome).trim()
      : meta.round_outcome != null
        ? String(meta.round_outcome).trim()
        : "";
  return Boolean(o);
}

function playSessionIdFromMeta(meta) {
  if (!meta || typeof meta !== "object") return "";
  const s =
    meta.playSessionId != null
      ? String(meta.playSessionId).trim()
      : meta.play_session_id != null
        ? String(meta.play_session_id).trim()
        : "";
  return s.slice(0, 64);
}

function gameIdFromMeta(meta) {
  if (!meta || typeof meta !== "object") return "";
  const gid = meta.gameId != null ? String(meta.gameId).trim() : "";
  return UUID_RE.test(gid) ? gid : "";
}

/** pg บางเส้นทางอาจได้ meta เป็น string */
function normalizeMetaFromDb(raw) {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return null;
    try {
      const o = JSON.parse(s);
      return o && typeof o === "object" && !Array.isArray(o) ? o : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  return null;
}

/**
 * แถวเก่าไม่มี playSessionId — จับคู่รางวัลจาก central_prize_awards ตามเกม + เวลา
 * (แต่ละ award ผูกกับ ledger game_start ล่าสุดก่อนเวลาชนะที่ยังไม่มีผล)
 */
async function enrichEntriesFromPrizeAwardsByGameTime(userId, entries) {
  const out = entries.map((e) => ({
    ...e,
    meta:
      e.meta && typeof e.meta === "object" && !Array.isArray(e.meta)
        ? { ...e.meta }
        : e.meta
  }));

  const ledgerSlots = [];
  for (let i = 0; i < out.length; i += 1) {
    const e = out[i];
    if (e.kind !== "game_start" || !e.meta || typeof e.meta !== "object") continue;
    if (metaHasRoundOutcome(e.meta)) continue;
    const gid = gameIdFromMeta(e.meta);
    if (!gid || !e.createdAt) continue;
    const t = new Date(e.createdAt).getTime();
    if (!Number.isFinite(t)) continue;
    ledgerSlots.push({ i, gameId: gid, t, matched: false });
  }
  if (ledgerSlots.length === 0) return out;

  const gameIds = [...new Set(ledgerSlots.map((x) => x.gameId))];
  let r;
  try {
    r = await requirePool().query(
      `SELECT id, game_id, created_at AS "createdAt",
              COALESCE(BTRIM(rule_prize_title), '') AS t,
              COALESCE(BTRIM(rule_prize_value_text), '') AS v,
              COALESCE(BTRIM(rule_prize_unit), '') AS u,
              prize_category
       FROM central_prize_awards
       WHERE winner_user_id = $1::uuid
         AND game_id = ANY($2::uuid[])
       ORDER BY created_at ASC`,
      [userId, gameIds]
    );
  } catch {
    return out;
  }

  const SKEW_MS = 120000;
  const MAX_MS_BEFORE_WIN = 72 * 60 * 60 * 1000;

  for (const row of r.rows) {
    const at = new Date(row.createdAt).getTime();
    if (!Number.isFinite(at)) continue;
    const gid = row.game_id != null ? String(row.game_id).trim() : "";
    if (!gid) continue;
    let best = null;
    for (const L of ledgerSlots) {
      if (L.matched || L.gameId !== gid) continue;
      if (L.t > at + SKEW_MS) continue;
      if (at - L.t > MAX_MS_BEFORE_WIN) continue;
      if (best == null || L.t > best.t) best = L;
    }
    if (!best) continue;
    best.matched = true;
    const e = out[best.i];
    const summary = prizeSummaryFromAwardRow(row);
    out[best.i] = {
      ...e,
      meta: {
        ...e.meta,
        roundOutcome: "won",
        roundPrizeSummary: summary
      }
    };
  }

  return out;
}

/** ผลรอบถาวร — ใช้เมื่ออ่าน ledger (รองรับหลาย instance / meta ไม่อัปเดต) */
async function enrichEntriesFromRoundOutcomesTable(userId, entries) {
  const sids = new Set();
  for (const e of entries) {
    if (e.kind !== "game_start" || !e.meta || typeof e.meta !== "object") continue;
    if (metaHasRoundOutcome(e.meta)) continue;
    const sid = playSessionIdFromMeta(e.meta);
    if (sid) sids.add(sid);
  }
  if (sids.size === 0) return entries;
  let r;
  try {
    r = await requirePool().query(
      `SELECT play_session_id, round_outcome, round_summary
       FROM central_game_round_outcomes
       WHERE user_id = $1::uuid AND play_session_id = ANY($2::text[])`,
      [userId, [...sids]]
    );
  } catch (e) {
    if (e && e.code === "42P01") return entries;
    throw e;
  }
  const map = new Map();
  for (const row of r.rows) {
    const ps = row.play_session_id != null ? String(row.play_session_id).trim() : "";
    if (!ps) continue;
    map.set(ps, {
      outcome: row.round_outcome != null ? String(row.round_outcome).trim() : "",
      summary: row.round_summary != null ? String(row.round_summary).trim() : ""
    });
  }
  return entries.map((e) => {
    if (e.kind !== "game_start" || !e.meta || typeof e.meta !== "object") return e;
    if (metaHasRoundOutcome(e.meta)) return e;
    const sid = playSessionIdFromMeta(e.meta);
    const hit = sid ? map.get(sid) : null;
    if (!hit || !hit.outcome) return e;
    return {
      ...e,
      meta: {
        ...e.meta,
        roundOutcome: hit.outcome,
        roundPrizeSummary: hit.summary || null
      }
    };
  });
}

function prizeSummaryFromAwardRow(row) {
  const cat = String(row.prize_category || "").toLowerCase();
  const head =
    row.t != null && String(row.t).trim()
      ? String(row.t).trim()
      : cat === "cash"
        ? "เงินสด"
        : cat === "item"
          ? "สิ่งของ"
          : "รางวัล";
  const tail = [row.v, row.u]
    .filter((x) => x != null && String(x).trim())
    .join(" ")
    .trim();
  return tail ? `${head}: ${tail}` : head;
}

/** เติมผลชนะจาก central_prize_awards เมื่อยังไม่มีใน meta/ตารางผลรอบ */
async function enrichEntriesFromPrizeAwards(userId, entries) {
  const sids = new Set();
  for (const e of entries) {
    if (e.kind !== "game_start" || !e.meta || typeof e.meta !== "object") continue;
    if (metaHasRoundOutcome(e.meta)) continue;
    const sid = playSessionIdFromMeta(e.meta);
    if (sid) sids.add(sid);
  }
  if (sids.size === 0) return entries;
  const pool = requirePool();
  const r = await pool.query(
    `SELECT play_session_id,
            COALESCE(BTRIM(rule_prize_title), '') AS t,
            COALESCE(BTRIM(rule_prize_value_text), '') AS v,
            COALESCE(BTRIM(rule_prize_unit), '') AS u,
            prize_category
     FROM central_prize_awards
     WHERE winner_user_id = $1::uuid
       AND play_session_id = ANY($2::text[])`,
    [userId, [...sids]]
  );
  const map = new Map();
  for (const row of r.rows) {
    const ps = row.play_session_id != null ? String(row.play_session_id).trim() : "";
    if (!ps) continue;
    map.set(ps, prizeSummaryFromAwardRow(row));
  }
  return entries.map((e) => {
    if (e.kind !== "game_start" || !e.meta || typeof e.meta !== "object") return e;
    if (metaHasRoundOutcome(e.meta)) return e;
    const sid = playSessionIdFromMeta(e.meta);
    const sum = sid ? map.get(sid) : null;
    if (!sum) return e;
    return {
      ...e,
      meta: {
        ...e.meta,
        roundOutcome: "won",
        roundPrizeSummary: sum
      }
    };
  });
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
  const pinkOnly = Boolean(opts.pinkOnly);
  const defaultLim = pinkOnly ? 400 : 80;
  /** pinkOnly: ดึงได้ลึก — กันประวัติชมพูหายเพราะโควตาแคบ */
  const maxLim = pinkOnly ? 3000 : 200;
  const lim = Math.min(maxLim, Math.max(1, Math.floor(Number(opts.limit) || defaultLim)));
  const off = Math.max(0, Math.floor(Number(opts.offset) || 0));
  const pinkSql = pinkOnly ? " AND COALESCE(pink_delta, 0) <> 0 " : "";
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
     WHERE user_id = $1${pinkSql}
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
    meta: normalizeMetaFromDb(row.meta)
  }));
  const withCodes = await enrichEntriesWithCentralGameCodes(rows);
  const withRounds = await enrichEntriesFromRoundOutcomesTable(userId, withCodes);
  const withAwardSid = await enrichEntriesFromPrizeAwards(userId, withRounds);
  return enrichEntriesFromPrizeAwardsByGameTime(userId, withAwardSid);
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

/**
 * บันทึกผลรอบลง DB (ถาวร) — ใช้คู่กับ merge meta
 * @param {{ userId: string; playSessionId: string; outcome: string; summary?: string | null }} p
 */
async function recordCentralRoundOutcome(p) {
  if (!p?.userId || !p?.playSessionId || !p?.outcome) return 0;
  const pool = requirePool();
  const sid = String(p.playSessionId).trim().slice(0, 64);
  const oc = String(p.outcome).trim().toLowerCase();
  if (oc !== "won" && oc !== "lost") return 0;
  const sum = p.summary != null ? String(p.summary).trim().slice(0, 2000) : null;
  try {
    const r = await pool.query(
      `INSERT INTO central_game_round_outcomes (play_session_id, user_id, round_outcome, round_summary)
       VALUES ($1, $2::uuid, $3, $4)
       ON CONFLICT (play_session_id) DO UPDATE SET
         round_outcome = EXCLUDED.round_outcome,
         round_summary = COALESCE(EXCLUDED.round_summary, central_game_round_outcomes.round_summary)`,
      [sid, p.userId, oc, sum || null]
    );
    return r.rowCount || 0;
  } catch (e) {
    if (e && e.code === "42P01") return 0;
    throw e;
  }
}

module.exports = {
  insertWithClient,
  listForUser,
  mergeMetaJsonByPlaySession,
  recordCentralRoundOutcome
};
