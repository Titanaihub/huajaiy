const { getPool } = require("../db/pool");
const memberPublicPostService = require("./memberPublicPostService");
const userService = require("./userService");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CHANNELS = new Set(["line", "facebook", "copy"]);

function requirePool() {
  const pool = getPool();
  if (!pool) {
    const e = new Error("DB_REQUIRED");
    e.code = "DB_REQUIRED";
    throw e;
  }
  return pool;
}

function displayLabel(u) {
  if (!u) return "";
  const fn = String(u.firstName || "").trim();
  const ln = String(u.lastName || "").trim();
  const full = [fn, ln].filter(Boolean).join(" ").trim();
  return full || String(u.username || "").trim();
}

/**
 * @param {string} actorUserId
 * @param {string} postId
 * @param {string} channel line|facebook|copy
 */
async function recordShareIntent(actorUserId, postId, channel) {
  if (!UUID_RE.test(String(postId || "").trim())) {
    const e = new Error("รูปแบบรหัสโพสต์ไม่ถูกต้อง");
    e.code = "VALIDATION";
    throw e;
  }
  const ch = String(channel || "").toLowerCase().trim();
  if (!CHANNELS.has(ch)) {
    const e = new Error("ช่องทางแชร์ไม่ถูกต้อง");
    e.code = "VALIDATION";
    throw e;
  }
  const pool = requirePool();
  const chk = await pool.query(`SELECT id FROM member_public_posts WHERE id = $1`, [
    postId
  ]);
  if (!chk.rows[0]) {
    const e = new Error("ไม่พบโพสต์");
    e.code = "NOT_FOUND";
    throw e;
  }
  await pool.query(
    `INSERT INTO member_public_post_share_intents (post_id, actor_user_id, channel)
     VALUES ($1, $2, $3)`,
    [postId, actorUserId, ch]
  );
  return { ok: true };
}

/**
 * @param {string} pageUsername เจ้าของเพจ
 * @param {string} postId
 * @param {string|null} refUsername ผู้ที่ลิงก์อ้างถึง (ต้องเป็นสมาชิกในระบบ)
 */
async function recordRefClick(pageUsername, postId, refUsername) {
  if (!UUID_RE.test(String(postId || "").trim())) return { ok: false };
  const ref = String(refUsername || "")
    .trim()
    .toLowerCase()
    .slice(0, 64);
  if (!ref) return { ok: true, skipped: true };

  const post = await memberPublicPostService.getPublicByUsernameAndPostId(
    pageUsername,
    postId
  );
  if (!post) return { ok: false, error: "not_found" };

  const refUser = await userService.findByUsername(ref);
  if (!refUser) return { ok: true, skipped: true };

  const pool = requirePool();
  await pool.query(
    `INSERT INTO member_public_post_ref_clicks (post_id, ref_user_id)
     VALUES ($1, $2)`,
    [postId, refUser.id]
  );
  return { ok: true };
}

/**
 * @param {string} ownerUserId
 * @param {string} postId
 */
async function getShareStatsForPostOwner(ownerUserId, postId) {
  if (!UUID_RE.test(String(postId || "").trim())) {
    const e = new Error("รูปแบบรหัสโพสต์ไม่ถูกต้อง");
    e.code = "VALIDATION";
    throw e;
  }
  const pool = requirePool();
  const own = await pool.query(
    `SELECT id FROM member_public_posts WHERE id = $1 AND user_id = $2`,
    [postId, ownerUserId]
  );
  if (!own.rows[0]) {
    const e = new Error("ไม่พบโพสต์หรือไม่มีสิทธิ์ดูสถิติ");
    e.code = "FORBIDDEN";
    throw e;
  }

  const intentsR = await pool.query(
    `SELECT s.channel, s.created_at, u.username, u.first_name, u.last_name
     FROM member_public_post_share_intents s
     JOIN users u ON u.id = s.actor_user_id
     WHERE s.post_id = $1
     ORDER BY s.created_at DESC
     LIMIT 400`,
    [postId]
  );

  const refR = await pool.query(
    `SELECT r.ref_user_id, u.username, u.first_name, u.last_name,
            COUNT(*)::int AS click_count
     FROM member_public_post_ref_clicks r
     JOIN users u ON u.id = r.ref_user_id
     WHERE r.post_id = $1
     GROUP BY r.ref_user_id, u.username, u.first_name, u.last_name
     ORDER BY click_count DESC`,
    [postId]
  );

  const totalR = await pool.query(
    `SELECT COUNT(*)::int AS n FROM member_public_post_ref_clicks WHERE post_id = $1`,
    [postId]
  );

  const intents = intentsR.rows.map((row) => ({
    channel: row.channel,
    createdAt: row.created_at,
    username: row.username,
    displayName: displayLabel({
      firstName: row.first_name,
      lastName: row.last_name,
      username: row.username
    })
  }));

  const refClicksByUser = refR.rows.map((row) => ({
    username: row.username,
    displayName: displayLabel({
      firstName: row.first_name,
      lastName: row.last_name,
      username: row.username
    }),
    clickCount: row.click_count
  }));

  return {
    intents,
    refClicksByUser,
    totalRefClicks: Number(totalR.rows[0]?.n) || 0
  };
}

module.exports = {
  recordShareIntent,
  recordRefClick,
  getShareStatsForPostOwner
};
