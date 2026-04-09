const { getPool } = require("../db/pool");
const memberPublicPostService = require("./memberPublicPostService");
const userService = require("./userService");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CHANNELS = new Set(["line", "facebook", "tiktok", "copy"]);

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
 * บันทึกการกดแชร์/คัดลอกจากเว็บ — actorUserId เป็น null เมื่อไม่ล็อกอิน
 * @param {string} postId
 * @param {string} channel line|facebook|copy
 * @param {string|null|undefined} actorUserId
 */
async function appendShareIntent(postId, channel, actorUserId) {
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
  const actor =
    actorUserId != null && String(actorUserId).trim() !== ""
      ? String(actorUserId).trim()
      : null;
  await pool.query(
    `INSERT INTO member_public_post_share_intents (post_id, actor_user_id, channel)
     VALUES ($1, $2, $3)`,
    [postId, actor, ch]
  );
  return { ok: true };
}

/**
 * @param {string} pageUsername
 * @param {string} postId
 * @param {string} channel
 */
async function appendPublicShareIntent(pageUsername, postId, channel) {
  const post = await memberPublicPostService.getPublicByUsernameAndPostId(
    pageUsername,
    postId
  );
  if (!post) {
    const e = new Error("ไม่พบโพสต์");
    e.code = "NOT_FOUND";
    throw e;
  }
  return appendShareIntent(postId, channel, null);
}

/**
 * บันทึกแชร์ + (ถ้าล็อกอิน) ลองจ่ายหัวใจแดงรางวัลในธุรกรรมเดียวกัน
 * @param {string} actorUserId
 * @param {string} postId
 * @param {string} channel
 * @returns {Promise<{ ok: true, shareReward: { granted: boolean, redAmount?: number } }>}
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
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const chk = await client.query(`SELECT id FROM member_public_posts WHERE id = $1`, [postId]);
    if (!chk.rows[0]) {
      const e = new Error("ไม่พบโพสต์");
      e.code = "NOT_FOUND";
      throw e;
    }
    const actor =
      actorUserId != null && String(actorUserId).trim() !== ""
        ? String(actorUserId).trim()
        : null;
    await client.query(
      `INSERT INTO member_public_post_share_intents (post_id, actor_user_id, channel)
       VALUES ($1, $2, $3)`,
      [postId, actor, ch]
    );
    let shareReward = { granted: false };
    if (actor) {
      const memberPublicPostShareRewardService = require("./memberPublicPostShareRewardService");
      shareReward = await memberPublicPostShareRewardService.tryGrantShareReward(
        client,
        postId,
        actor
      );
    }
    await client.query("COMMIT");
    return { ok: true, shareReward };
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw e;
  } finally {
    client.release();
  }
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
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO member_public_post_ref_clicks (post_id, ref_user_id)
       VALUES ($1, $2)`,
      [postId, refUser.id]
    );
    /** tryGrantShareReward ต้องมีแถวใน share_intents — ref ใส่เฉพาะฝั่งเซิร์ฟเวอร์ (ไม่อยู่ใน CHANNELS ของ client) */
    await client.query(
      `INSERT INTO member_public_post_share_intents (post_id, actor_user_id, channel)
       VALUES ($1, $2, 'ref')`,
      [postId, refUser.id]
    );
    const memberPublicPostShareRewardService = require("./memberPublicPostShareRewardService");
    await memberPublicPostShareRewardService.tryGrantShareReward(
      client,
      postId,
      refUser.id
    );
    await client.query("COMMIT");
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw e;
  } finally {
    client.release();
  }
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
    `SELECT s.channel, s.created_at, s.actor_user_id, u.username, u.first_name, u.last_name
     FROM member_public_post_share_intents s
     LEFT JOIN users u ON u.id = s.actor_user_id
     WHERE s.post_id = $1
     ORDER BY s.created_at DESC
     LIMIT 500`,
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

  const countR = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE actor_user_id IS NULL)::int AS anonymous,
       COUNT(*) FILTER (WHERE actor_user_id IS NOT NULL)::int AS identified
     FROM member_public_post_share_intents
     WHERE post_id = $1`,
    [postId]
  );

  const intents = intentsR.rows.map((row) => {
    const hasUser = Boolean(row.username || row.actor_user_id);
    return {
      channel: row.channel,
      createdAt: row.created_at,
      username: hasUser ? row.username : null,
      displayName: hasUser
        ? displayLabel({
            firstName: row.first_name,
            lastName: row.last_name,
            username: row.username
          })
        : "ผู้เยี่ยมชม (ไม่ล็อกอิน)",
      anonymous: !hasUser
    };
  });

  const refClicksByUser = refR.rows.map((row) => ({
    username: row.username,
    displayName: displayLabel({
      firstName: row.first_name,
      lastName: row.last_name,
      username: row.username
    }),
    clickCount: row.click_count
  }));

  const crow = countR.rows[0] || {};

  return {
    intents,
    refClicksByUser,
    totalRefClicks: Number(totalR.rows[0]?.n) || 0,
    shareIntentTotal: Number(crow.total) || 0,
    shareIntentAnonymous: Number(crow.anonymous) || 0,
    shareIntentIdentified: Number(crow.identified) || 0
  };
}

module.exports = {
  appendShareIntent,
  appendPublicShareIntent,
  recordShareIntent,
  recordRefClick,
  getShareStatsForPostOwner
};
