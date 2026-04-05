const { getPool } = require("../db/pool");
const userService = require("./userService");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MIN_PER = 1;
const MAX_PER = 10000;
const MIN_BUDGET = 1;
const MAX_BUDGET = 500000;

/** ลิงก์ที่มี ?ref=ผู้แชร์ ต้องถูกเปิดอย่างน้อยกี่ครั้ง (นับทุกแถวใน member_public_post_ref_clicks) — "เกิน 10 ครั้ง" = 11 */
const MIN_REF_CLICKS_FOR_SHARE_REWARD = 11;

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
 * @param {string} postId
 * @param {string|null|undefined} recipientUserId
 * @returns {Promise<{ granted: boolean; redAmount?: number }>}
 */
async function tryGrantShareReward(client, postId, recipientUserId) {
  if (!recipientUserId || String(recipientUserId).trim() === "") {
    return { granted: false };
  }
  const pr = await client.query(
    `SELECT p.user_id, p.share_red_status, p.share_red_per_member, p.share_red_pool_remaining, p.share_red_recipients_count
     FROM member_public_posts p WHERE p.id = $1 FOR UPDATE`,
    [postId]
  );
  const row = pr.rows[0];
  if (!row) return { granted: false };
  const ownerId = String(row.user_id);
  const recId = String(recipientUserId).trim();
  if (recId === ownerId) return { granted: false };
  if (String(row.share_red_status) !== "active") return { granted: false };

  const per = Math.floor(Number(row.share_red_per_member) || 0);
  const poolRem = Math.floor(Number(row.share_red_pool_remaining) || 0);
  const rc = Math.floor(Number(row.share_red_recipients_count) || 0);
  if (per < MIN_PER || poolRem < per) return { granted: false };

  const dup = await client.query(
    `SELECT 1 FROM member_public_post_share_reward_recipients WHERE post_id = $1 AND user_id = $2`,
    [postId, recId]
  );
  if (dup.rows.length) return { granted: false };

  const intentR = await client.query(
    `SELECT 1 FROM member_public_post_share_intents
     WHERE post_id = $1 AND actor_user_id = $2
     LIMIT 1`,
    [postId, recId]
  );
  if (!intentR.rows.length) return { granted: false };

  const refCntR = await client.query(
    `SELECT COUNT(*)::int AS n FROM member_public_post_ref_clicks
     WHERE post_id = $1 AND ref_user_id = $2`,
    [postId, recId]
  );
  const refClicks = Number(refCntR.rows[0]?.n) || 0;
  if (refClicks < MIN_REF_CLICKS_FOR_SHARE_REWARD) return { granted: false };

  await client.query(
    `INSERT INTO member_public_post_share_reward_recipients (post_id, user_id, red_amount) VALUES ($1, $2, $3)`,
    [postId, recId, per]
  );

  await userService.adjustDualHeartsWithClient(client, recId, 0, per, {
    kind: "public_post_share_reward",
    label: "รางวัลแชร์โพสต์ (หัวใจแดง)",
    meta: { postId }
  });

  const newPool = poolRem - per;
  const newRc = rc + 1;

  if (newPool < per) {
    if (newPool > 0) {
      await userService.adjustDualHeartsWithClient(client, ownerId, 0, newPool, {
        kind: "public_post_share_refund",
        label: "คืนหัวใจแดงคงเหลือ (แจกแชร์โพสต์)",
        meta: { postId }
      });
    }
    await client.query(
      `UPDATE member_public_posts SET
        share_red_pool_remaining = 0,
        share_red_status = 'depleted',
        share_red_recipients_count = $2,
        updated_at = NOW()
       WHERE id = $1`,
      [postId, newRc]
    );
  } else {
    await client.query(
      `UPDATE member_public_posts SET
        share_red_pool_remaining = $2,
        share_red_recipients_count = $3,
        updated_at = NOW()
       WHERE id = $1`,
      [postId, newPool, newRc]
    );
  }

  return { granted: true, redAmount: per };
}

/**
 * @param {string} ownerUserId
 * @param {string} postId
 * @param {number} redPerMember
 * @param {number} redBudget
 */
async function startCampaign(ownerUserId, postId, redPerMember, redBudget) {
  if (!UUID_RE.test(String(postId || "").trim())) {
    const e = new Error("รูปแบบรหัสโพสต์ไม่ถูกต้อง");
    e.code = "VALIDATION";
    throw e;
  }
  const per = Math.floor(Number(redPerMember) || 0);
  const budget = Math.floor(Number(redBudget) || 0);
  if (per < MIN_PER || per > MAX_PER) {
    const e = new Error(`หัวใจแดงต่อสมาชิกต้องอยู่ระหว่าง ${MIN_PER}–${MAX_PER}`);
    e.code = "VALIDATION";
    throw e;
  }
  if (budget < per || budget > MAX_BUDGET) {
    const e = new Error(`วงเงินรวมต้องอย่างน้อย ${per} และไม่เกิน ${MAX_BUDGET}`);
    e.code = "VALIDATION";
    throw e;
  }

  const pool = requirePool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const pr = await client.query(
      `SELECT id, user_id, share_red_status FROM member_public_posts WHERE id = $1 FOR UPDATE`,
      [postId]
    );
    const row = pr.rows[0];
    if (!row || String(row.user_id) !== String(ownerUserId)) {
      const e = new Error(!row ? "ไม่พบโพสต์" : "ไม่มีสิทธิ์ตั้งค่าโพสต์นี้");
      e.code = !row ? "NOT_FOUND" : "FORBIDDEN";
      throw e;
    }
    if (String(row.share_red_status) === "active") {
      const e = new Error("แคมเปญกำลังเปิดอยู่ — กดระงับก่อนเริ่มรอบใหม่");
      e.code = "CONFLICT";
      throw e;
    }

    const bal = await client.query(
      `SELECT red_hearts_balance FROM users WHERE id = $1 FOR UPDATE`,
      [ownerUserId]
    );
    const curRed = Math.floor(Number(bal.rows[0]?.red_hearts_balance) || 0);
    if (curRed < budget) {
      const e = new Error("หัวใจแดงไม่พอสำหรับวงเงินที่ตั้ง");
      e.code = "INSUFFICIENT_HEARTS";
      throw e;
    }

    await client.query(
      `DELETE FROM member_public_post_share_reward_recipients WHERE post_id = $1`,
      [postId]
    );

    await userService.adjustDualHeartsWithClient(client, ownerUserId, 0, -budget, {
      kind: "public_post_share_escrow",
      label: "กันวงเงินแจกหัวใจแดงเมื่อแชร์โพสต์",
      meta: { postId }
    });

    await client.query(
      `UPDATE member_public_posts SET
        share_red_per_member = $2,
        share_red_initial_budget = $3,
        share_red_pool_remaining = $3,
        share_red_status = 'active',
        share_red_recipients_count = 0,
        updated_at = NOW()
       WHERE id = $1`,
      [postId, per, budget]
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

  const memberPublicPostService = require("./memberPublicPostService");
  return memberPublicPostService.getForUser(ownerUserId, postId);
}

/**
 * @param {string} ownerUserId
 * @param {string} postId
 */
async function pauseCampaign(ownerUserId, postId) {
  if (!UUID_RE.test(String(postId || "").trim())) {
    const e = new Error("รูปแบบรหัสโพสต์ไม่ถูกต้อง");
    e.code = "VALIDATION";
    throw e;
  }

  const pool = requirePool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const pr = await client.query(
      `SELECT id, user_id, share_red_status, share_red_pool_remaining
       FROM member_public_posts WHERE id = $1 FOR UPDATE`,
      [postId]
    );
    const row = pr.rows[0];
    if (!row || String(row.user_id) !== String(ownerUserId)) {
      const e = new Error(!row ? "ไม่พบโพสต์" : "ไม่มีสิทธิ์ตั้งค่าโพสต์นี้");
      e.code = !row ? "NOT_FOUND" : "FORBIDDEN";
      throw e;
    }

    const st = String(row.share_red_status || "off");
    const poolRem = Math.floor(Number(row.share_red_pool_remaining) || 0);

    if (st === "active") {
      if (poolRem > 0) {
        await userService.adjustDualHeartsWithClient(client, ownerUserId, 0, poolRem, {
          kind: "public_post_share_pause_refund",
          label: "คืนหัวใจแดงที่กันไว้ (ระงับแจกแชร์โพสต์)",
          meta: { postId }
        });
      }
      await client.query(
        `UPDATE member_public_posts SET
          share_red_pool_remaining = 0,
          share_red_status = 'paused',
          updated_at = NOW()
         WHERE id = $1`,
        [postId]
      );
    }

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

  const memberPublicPostService = require("./memberPublicPostService");
  return memberPublicPostService.getForUser(ownerUserId, postId);
}

module.exports = {
  tryGrantShareReward,
  startCampaign,
  pauseCampaign,
  MIN_REF_CLICKS_FOR_SHARE_REWARD
};
