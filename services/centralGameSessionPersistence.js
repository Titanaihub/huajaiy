/**
 * เก็บสถานะรอบเกมส่วนกลางใน PostgreSQL — รีสตาร์ท API แล้วโหลดกลับได้
 * (หักหัวใจแล้วที่ ledger — ไม่ให้รอบหายเพราะแค่หน่วยความจำ)
 */
const { getPool } = require("../db/pool");

function serializeGameSnapshot(gs) {
  const imageUrlObj = {};
  if (gs.imageUrl instanceof Map) {
    for (const [k, v] of gs.imageUrl.entries()) {
      imageUrlObj[k] = v;
    }
  } else if (gs.imageUrl && typeof gs.imageUrl === "object") {
    Object.assign(imageUrlObj, gs.imageUrl);
  }
  return { game: gs.game, rules: gs.rules, imageUrl: imageUrlObj };
}

function deserializeGameSnapshot(gs) {
  const imageUrl = new Map();
  if (gs.imageUrl && typeof gs.imageUrl === "object") {
    for (const [k, v] of Object.entries(gs.imageUrl)) {
      imageUrl.set(k, v);
    }
  }
  return { game: gs.game, imageUrl, rules: gs.rules };
}

function serializeSession(session) {
  return {
    gameId: session.gameId,
    deck: session.deck,
    revealed: session.revealed,
    flips: session.flips,
    winnerRuleId: session.winnerRuleId,
    lossRuleId: session.lossRuleId,
    gameSnapshot: serializeGameSnapshot(session.gameSnapshot),
    ownerUserId: session.ownerUserId,
    sessionProof: session.sessionProof,
    createdAt: session.createdAt
  };
}

function deserializeSession(row) {
  const d = typeof row === "string" ? JSON.parse(row) : row;
  const gameSnapshot = deserializeGameSnapshot(d.gameSnapshot);
  return {
    gameId: d.gameId,
    deck: d.deck,
    revealed: d.revealed,
    flips: d.flips,
    winnerRuleId: d.winnerRuleId ?? null,
    lossRuleId: d.lossRuleId ?? null,
    gameSnapshot,
    ownerUserId: d.ownerUserId ?? null,
    sessionProof: d.sessionProof,
    createdAt: d.createdAt
  };
}

/** กันข้อมูล JSON เสีย/ไม่ครบ — ไม่ให้โหลดแล้วพังหรือโกง */
function isValidPersistedSession(s) {
  if (!s || typeof s !== "object") return false;
  if (!s.gameSnapshot || !s.gameSnapshot.game) return false;
  const g = s.gameSnapshot.game;
  const tc = Math.floor(Number(g.tileCount) || 0);
  if (tc <= 0 || tc > 512) return false;
  if (!Array.isArray(s.deck) || s.deck.length !== tc) return false;
  if (!Array.isArray(s.revealed) || s.revealed.length !== tc) return false;
  if (typeof s.sessionProof !== "string" || !s.sessionProof.trim()) return false;
  if (s.flips != null && (typeof s.flips !== "number" || s.flips < 0 || s.flips > tc)) {
    return false;
  }
  for (let i = 0; i < tc; i += 1) {
    const c = s.deck[i];
    if (!c || typeof c !== "object") return false;
    if (!Number.isInteger(c.setIndex) || !Number.isInteger(c.imageIndex)) return false;
  }
  return true;
}

async function upsertPlaySession(sessionId, session) {
  const pool = getPool();
  if (!pool) return;
  const payload = serializeSession(session);
  await pool.query(
    `INSERT INTO central_game_play_sessions (id, owner_user_id, session_proof, state_json, updated_at)
     VALUES ($1, $2::uuid, $3, $4::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET
       state_json = EXCLUDED.state_json,
       session_proof = EXCLUDED.session_proof,
       updated_at = NOW(),
       owner_user_id = COALESCE(EXCLUDED.owner_user_id, central_game_play_sessions.owner_user_id)`,
    [sessionId, session.ownerUserId || null, session.sessionProof, JSON.stringify(payload)]
  );
}

async function loadPlaySession(sessionId) {
  const pool = getPool();
  if (!pool) return null;
  const r = await pool.query(
    `SELECT state_json FROM central_game_play_sessions WHERE id = $1`,
    [sessionId]
  );
  if (r.rows.length === 0) return null;
  let loaded;
  try {
    loaded = deserializeSession(r.rows[0].state_json);
  } catch (e) {
    console.warn("[central_game_play_sessions] deserialize:", e.message);
    await deletePlaySession(sessionId);
    return null;
  }
  if (!isValidPersistedSession(loaded)) {
    console.warn("[central_game_play_sessions] invalid row, deleting:", sessionId);
    await deletePlaySession(sessionId);
    return null;
  }
  return loaded;
}

async function hasPlaySession(sessionId) {
  const pool = getPool();
  if (!pool) return false;
  const r = await pool.query(
    `SELECT 1 FROM central_game_play_sessions WHERE id = $1`,
    [sessionId]
  );
  return r.rows.length > 0;
}

async function deletePlaySession(sessionId) {
  const pool = getPool();
  if (!pool) return 0;
  const r = await pool.query(`DELETE FROM central_game_play_sessions WHERE id = $1`, [
    sessionId
  ]);
  return r.rowCount || 0;
}

/** ลบแถวเก่าตามอายุ (เดียวกับ prune หน่วยความจำ) */
async function prunePlaySessionsOlderThan(ms) {
  const pool = getPool();
  if (!pool) return 0;
  const r = await pool.query(
    `DELETE FROM central_game_play_sessions
     WHERE updated_at < NOW() - (INTERVAL '1 millisecond' * $1::bigint)`,
    [Math.max(1, Math.floor(Number(ms) || 0))]
  );
  return r.rowCount || 0;
}

module.exports = {
  upsertPlaySession,
  loadPlaySession,
  hasPlaySession,
  deletePlaySession,
  prunePlaySessionsOlderThan,
  serializeSession,
  deserializeSession,
  isValidPersistedSession
};
