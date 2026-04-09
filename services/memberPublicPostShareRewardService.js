const { getPool } = require("../db/pool");
const heartLedgerService = require("./heartLedgerService");
const userService = require("./userService");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MIN_PER = 1;
const MAX_PER = 10000;
const MIN_BUDGET = 1;
const MAX_BUDGET = 500000;

/** สมาชิกล็อกอินที่กดแชร์จากเว็บได้รับรางวัลทันที (คนละครั้งต่อโพสต์) */
const MIN_REF_CLICKS_FOR_SHARE_REWARD = 0;

/**
 * คืนวงเงินคงเหลือให้เจ้าของโพสต์ — แบ่งคืนตามสัดส่วนที่กันมาจากแจก vs กระเป๋า (รองรับแถวเก่า esc=0 → คืนกระเป๋าทั้งหมด)
 */
function splitProportionalRefund(amount, initialBudget, escrowFromGive, escrowFromWallet) {
  const a = Math.max(0, Math.floor(Number(amount) || 0));
  const b = Math.max(0, Math.floor(Number(initialBudget) || 0));
  const eg = Math.max(0, Math.floor(Number(escrowFromGive) || 0));
  const ew = Math.max(0, Math.floor(Number(escrowFromWallet) || 0));
  if (a <= 0) return { toGiveaway: 0, toWallet: 0 };
  if (b <= 0 || eg + ew === 0) return { toGiveaway: 0, toWallet: a };
  const toG = Math.min(a, Math.floor((a * eg) / b));
  const toW = a - toG;
  return { toGiveaway: toG, toWallet: toW };
}

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
 * ส่วนที่เหลือใน pool แยกว่ามาจากแดงแจก vs กระเป๋า (สูตรเดียวกับ sumActiveShareEscrowForUser)
 * @param {{ share_red_pool_remaining: unknown; share_red_initial_budget: unknown; eg?: unknown; ew?: unknown }} row
 */
function splitSharePoolPortions(row) {
  const poolRem = Math.max(0, Math.floor(Number(row.share_red_pool_remaining) || 0));
  const initB = Math.max(0, Math.floor(Number(row.share_red_initial_budget) || 0));
  const eg = Math.max(0, Math.floor(Number(row.eg) || 0));
  const ew = Math.max(0, Math.floor(Number(row.ew) || 0));
  if (poolRem <= 0 || initB <= 0) return { giveawayPart: 0, walletPart: 0 };
  if (eg + ew === 0) return { giveawayPart: 0, walletPart: poolRem };
  const giveawayPart = Math.min(poolRem, Math.floor((poolRem * eg) / initB));
  return { giveawayPart, walletPart: poolRem - giveawayPart };
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
    `SELECT p.user_id, p.title, p.share_red_status, p.share_red_per_member, p.share_red_pool_remaining, p.share_red_recipients_count,
            p.share_red_initial_budget,
            COALESCE(p.share_red_escrow_from_giveaway, 0) AS share_red_escrow_from_giveaway,
            COALESCE(p.share_red_escrow_from_wallet, 0) AS share_red_escrow_from_wallet
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

  const postTitle = String(row.title || "").trim() || "โพสต์";
  const unR = await client.query(`SELECT username FROM users WHERE id = $1::uuid`, [recId]);
  const recipientUsername =
    unR.rows[0]?.username != null ? String(unR.rows[0].username).trim() : null;

  const newPool = poolRem - per;
  const newRc = rc + 1;

  if (newPool < per) {
    if (newPool > 0) {
      const initB = Math.floor(Number(row.share_red_initial_budget) || 0);
      const escG = Math.floor(Number(row.share_red_escrow_from_giveaway) || 0);
      const escW = Math.floor(Number(row.share_red_escrow_from_wallet) || 0);
      const { toGiveaway, toWallet } = splitProportionalRefund(newPool, initB, escG, escW);
      await userService.adjustRedWalletAndGiveawayWithClient(client, ownerId, toWallet, toGiveaway, {
        kind: "public_post_share_refund",
        label: "คืนหัวใจแดงคงเหลือ (แจกแชร์โพสต์)",
        meta: {
          postId,
          postTitle: postTitle.slice(0, 200)
        }
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

  const finalPoolRemaining = newPool < per ? 0 : newPool;
  const ownSnap = await client.query(
    `SELECT pink_hearts_balance, red_hearts_balance, COALESCE(red_giveaway_balance, 0) AS rg
     FROM users WHERE id = $1::uuid`,
    [ownerId]
  );
  const ob = ownSnap.rows[0];
  const pinkAfter = Math.max(0, Math.floor(Number(ob?.pink_hearts_balance) || 0));
  const redAfter = Math.max(0, Math.floor(Number(ob?.red_hearts_balance) || 0));
  const rgAfter = Math.max(0, Math.floor(Number(ob?.rg) || 0));
  await heartLedgerService.insertWithClient(client, {
    userId: ownerId,
    pinkDelta: 0,
    redDelta: 0,
    pinkAfter,
    redAfter,
    kind: "public_post_share_reward_paid",
    label: "จ่ายรางวัลแชร์โพสต์",
    meta: {
      postId,
      postTitle: postTitle.slice(0, 200),
      recipientUserId: recId,
      recipientUsername: recipientUsername || null,
      redAmount: per,
      redGiveawayBalanceAfter: rgAfter,
      sharePoolRemainingAfter: finalPoolRemaining
    }
  });

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
      `SELECT id, user_id, share_red_status, title FROM member_public_posts WHERE id = $1 FOR UPDATE`,
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
      `SELECT red_hearts_balance, COALESCE(red_giveaway_balance, 0) AS rg FROM users WHERE id = $1 FOR UPDATE`,
      [ownerUserId]
    );
    const curWallet = Math.floor(Number(bal.rows[0]?.red_hearts_balance) || 0);
    const curGive = Math.floor(Number(bal.rows[0]?.rg) || 0);
    const totalRed = curWallet + curGive;
    if (totalRed < budget) {
      const e = new Error(
        "หัวใจแดงในกระเป๋าและหัวใจแดงสำหรับแจกรวมกันไม่พอสำหรับวงเงินที่ตั้ง"
      );
      e.code = "INSUFFICIENT_HEARTS";
      throw e;
    }
    const fromGive = Math.min(budget, curGive);
    const fromWallet = budget - fromGive;

    await client.query(
      `DELETE FROM member_public_post_share_reward_recipients WHERE post_id = $1`,
      [postId]
    );

    await userService.adjustRedWalletAndGiveawayWithClient(
      client,
      ownerUserId,
      -fromWallet,
      -fromGive,
      {
        kind: "public_post_share_escrow",
        label: "กันวงเงินแจกหัวใจแดงเมื่อแชร์โพสต์",
        meta: {
          postId,
          postTitle: String(row.title || "").trim().slice(0, 200) || "โพสต์"
        }
      }
    );

    await client.query(
      `UPDATE member_public_posts SET
        share_red_per_member = $2,
        share_red_initial_budget = $3,
        share_red_pool_remaining = $3,
        share_red_status = 'active',
        share_red_recipients_count = 0,
        share_red_escrow_from_wallet = $4,
        share_red_escrow_from_giveaway = $5,
        updated_at = NOW()
       WHERE id = $1`,
      [postId, per, budget, fromWallet, fromGive]
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
      `SELECT id, user_id, title, share_red_status, share_red_pool_remaining, share_red_initial_budget,
              COALESCE(share_red_escrow_from_giveaway, 0) AS share_red_escrow_from_giveaway,
              COALESCE(share_red_escrow_from_wallet, 0) AS share_red_escrow_from_wallet
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
        const initB = Math.floor(Number(row.share_red_initial_budget) || 0);
        const escG = Math.floor(Number(row.share_red_escrow_from_giveaway) || 0);
        const escW = Math.floor(Number(row.share_red_escrow_from_wallet) || 0);
        const { toGiveaway, toWallet } = splitProportionalRefund(poolRem, initB, escG, escW);
        await userService.adjustRedWalletAndGiveawayWithClient(
          client,
          ownerUserId,
          toWallet,
          toGiveaway,
          {
            kind: "public_post_share_pause_refund",
            label: "คืนหัวใจแดงที่กันไว้ (ระงับแจกแชร์โพสต์)",
            meta: {
              postId,
              postTitle: String(row.title || "").trim().slice(0, 200) || "โพสต์"
            }
          }
        );
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

/**
 * ยอดในมัดจำแคมเปญแชร์โพสต์ที่ยัง active — แยกว่าส่วนที่เหลือใน pool มาจากแดงแจกหรือกระเป๋า (ต่อโพสต์: g = floor(pool*eg/init), w = pool-g)
 * แถวเก่า esc=0 ถือว่าทั้ง pool มาจากกระเป๋า
 * @param {string} userId
 * @returns {Promise<{ giveawayPool: number; walletPool: number }>}
 */
async function sumActiveShareEscrowForUser(userId) {
  const uid = String(userId || "").trim();
  if (!UUID_RE.test(uid)) return { giveawayPool: 0, walletPool: 0 };
  const pool = requirePool();
  let giveawayPool = 0;
  let walletPool = 0;
  const r = await pool.query(
    `SELECT share_red_pool_remaining, share_red_initial_budget,
            COALESCE(share_red_escrow_from_giveaway, 0) AS eg,
            COALESCE(share_red_escrow_from_wallet, 0) AS ew
     FROM member_public_posts
     WHERE user_id = $1::uuid AND share_red_status = 'active'`,
    [uid]
  );
  for (const row of r.rows) {
    const { giveawayPart, walletPart } = splitSharePoolPortions(row);
    giveawayPool += giveawayPart;
    walletPool += walletPart;
  }
  return { giveawayPool, walletPool };
}

/**
 * แคมเปญแชร์ที่ยัง active ต่อโพสต์ (หัวข้อ + ยอดกันแชร์แยกแดงแจก/กระเป๋า)
 * @param {string} userId
 * @returns {Promise<Array<{ postId: string; title: string; poolRemaining: number; reservedFromGiveaway: number; reservedFromWallet: number }>>}
 */
async function listActiveShareCampaignsForUser(userId) {
  const uid = String(userId || "").trim();
  if (!UUID_RE.test(uid)) return [];
  const pool = requirePool();
  const r = await pool.query(
    `SELECT id, title, share_red_pool_remaining, share_red_initial_budget,
            COALESCE(share_red_escrow_from_giveaway, 0) AS eg,
            COALESCE(share_red_escrow_from_wallet, 0) AS ew
     FROM member_public_posts
     WHERE user_id = $1::uuid AND share_red_status = 'active'
     ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST`,
    [uid]
  );
  return r.rows.map((row) => {
    const poolRem = Math.max(0, Math.floor(Number(row.share_red_pool_remaining) || 0));
    const { giveawayPart, walletPart } = splitSharePoolPortions(row);
    return {
      postId: String(row.id),
      title: String(row.title || "").trim() || "โพสต์",
      poolRemaining: poolRem,
      reservedFromGiveaway: giveawayPart,
      reservedFromWallet: walletPart
    };
  });
}

module.exports = {
  tryGrantShareReward,
  startCampaign,
  pauseCampaign,
  sumActiveShareEscrowForUser,
  listActiveShareCampaignsForUser,
  MIN_REF_CLICKS_FOR_SHARE_REWARD
};
