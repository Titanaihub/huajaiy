const crypto = require("crypto");
const { getPool } = require("../db/pool");
const userService = require("./userService");
const {
  MIN_REF_CLICKS_FOR_SHARE_REWARD
} = require("./memberPublicPostShareRewardService");

const SHARE_REWARD_COLS = `share_red_per_member, share_red_pool_remaining, share_red_initial_budget, share_red_status, share_red_recipients_count`;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_BLOCKS = 50;
const MAX_PARAGRAPH = 8000;
const MAX_TITLE = 200;
const MAX_SORT = 999999;

function requirePool() {
  const pool = getPool();
  if (!pool) {
    const e = new Error("DB_REQUIRED");
    e.code = "DB_REQUIRED";
    throw e;
  }
  return pool;
}

function normalizeLayout(v) {
  const s = String(v || "").toLowerCase().trim();
  return s === "stack" ? "stack" : "row";
}

function sanitizeCoverUrl(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  if (!/^https:\/\//i.test(s)) return null;
  return s.slice(0, 1024);
}

function sanitizeTitle(v) {
  const s = String(v ?? "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, MAX_TITLE);
  return s;
}

/**
 * @param {unknown} raw
 * @returns {Array<{ type: string }>}
 */
function sanitizeBodyBlocks(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const b of raw.slice(0, MAX_BLOCKS)) {
    if (!b || typeof b !== "object") continue;
    const t = String(b.type || "")
      .toLowerCase()
      .trim();
    if (t === "paragraph") {
      const text = String(b.text ?? "")
        .replace(/\u0000/g, "")
        .trim()
        .slice(0, MAX_PARAGRAPH);
      if (text) out.push({ type: "paragraph", text });
    } else if (t === "image") {
      const url = String(b.url ?? "").trim();
      if (/^https:\/\//i.test(url) && url.length <= 1024) {
        out.push({ type: "image", url });
      }
    } else if (t === "link") {
      const url = String(b.url ?? "").trim();
      const label = String(b.label ?? "")
        .replace(/\u0000/g, "")
        .trim()
        .slice(0, 200);
      if (/^https:\/\//i.test(url) && url.length <= 1024) {
        out.push({ type: "link", url, label: label || url });
      }
    }
  }
  return out;
}

/**
 * @param {Record<string, unknown>} row
 * @param {{ forOwner?: boolean }} opts
 */
function shareRewardPayload(row, opts = {}) {
  const forOwner = opts.forOwner === true;
  const stRaw = row.share_red_status;
  const status =
    stRaw === "active" || stRaw === "paused" || stRaw === "depleted" || stRaw === "off"
      ? stRaw
      : "off";
  const per = Math.max(0, Math.floor(Number(row.share_red_per_member) || 0));
  const poolRem = Math.max(0, Math.floor(Number(row.share_red_pool_remaining) || 0));
  const initial = Math.max(0, Math.floor(Number(row.share_red_initial_budget) || 0));
  const rc = Math.max(0, Math.floor(Number(row.share_red_recipients_count) || 0));
  const maxSlots = per > 0 && initial > 0 ? Math.floor(initial / per) : 0;
  const slotsLeft = per > 0 && status === "active" ? Math.floor(poolRem / per) : 0;

  let visitorMessage = null;
  if (status === "active" && per > 0) {
    const needRef = MIN_REF_CLICKS_FOR_SHARE_REWARD;
    visitorMessage = `แชร์ผ่านปุ่มบนเว็บขณะล็อกอิน แล้วให้ลิงก์ที่มี ref ของคุณถูกเปิดมากกว่า ${needRef - 1} ครั้ง — จึงจะได้หัวใจแดง ${per} ดวง (สูงสุด ${maxSlots} คนแรก)`;
    if (slotsLeft > 0) {
      visitorMessage += ` — เหลือประมาณ ${slotsLeft} สิทธิ`;
    }
  } else if (status === "paused") {
    visitorMessage = "ผู้โพสต์ระงับการแจกหัวใจก่อนเวลา";
  } else if (status === "depleted") {
    visitorMessage = "หัวใจแจกหมดแล้ว";
  }

  const base = {
    status,
    redPerMember: per > 0 ? per : null,
    initialBudget: initial > 0 ? initial : null,
    maxRecipientSlots: maxSlots > 0 ? maxSlots : null,
    recipientsCount: rc,
    visitorMessage,
    minRefClicksForReward:
      status === "active" && per > 0 ? MIN_REF_CLICKS_FOR_SHARE_REWARD : null
  };
  if (!forOwner) return base;
  return {
    ...base,
    poolRemaining: poolRem,
    canStart: status !== "active",
    canPause: status === "active"
  };
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @param {{ forOwner?: boolean }} opts
 */
function rowToPost(row, opts = {}) {
  if (!row) return null;
  let blocks = [];
  try {
    const raw = row.body_blocks;
    if (Array.isArray(raw)) blocks = sanitizeBodyBlocks(raw);
    else if (raw && typeof raw === "object") blocks = [];
  } catch {
    blocks = [];
  }
  return {
    id: row.id,
    title: row.title,
    coverImageUrl: row.cover_image_url || null,
    bodyBlocks: blocks,
    layout: row.layout === "stack" ? "stack" : "row",
    sortOrder: Number(row.sort_order) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    shareReward: shareRewardPayload(row, { forOwner: opts.forOwner === true })
  };
}

/**
 * @param {string} username
 */
async function listPublicByUsername(username) {
  const pool = requirePool();
  const un = String(username || "").toLowerCase().trim();
  const r = await pool.query(
    `SELECT p.id, p.title, p.cover_image_url, p.body_blocks, p.layout, p.sort_order, p.created_at, p.updated_at,
            p.share_red_per_member, p.share_red_pool_remaining, p.share_red_initial_budget,
            p.share_red_status, p.share_red_recipients_count
     FROM member_public_posts p
     JOIN users u ON u.id = p.user_id
     WHERE u.username = $1
     ORDER BY p.sort_order ASC, p.created_at DESC`,
    [un]
  );
  return r.rows.map((row) => rowToPost(row)).filter(Boolean);
}

/**
 * โพสต์เดียวตามเพจ (username) + id — สำหรับหน้าแชร์/OG
 * @param {string} username
 * @param {string} postId
 */
async function getPublicByUsernameAndPostId(username, postId) {
  if (!UUID_RE.test(String(postId || "").trim())) return null;
  const pool = requirePool();
  const un = String(username || "").toLowerCase().trim();
  const r = await pool.query(
    `SELECT p.id, p.title, p.cover_image_url, p.body_blocks, p.layout, p.sort_order, p.created_at, p.updated_at,
            p.share_red_per_member, p.share_red_pool_remaining, p.share_red_initial_budget,
            p.share_red_status, p.share_red_recipients_count
     FROM member_public_posts p
     JOIN users u ON u.id = p.user_id
     WHERE u.username = $1 AND p.id = $2`,
    [un, postId]
  );
  return rowToPost(r.rows[0]);
}

/**
 * @param {string} userId
 */
async function listByUserId(userId) {
  const pool = requirePool();
  const r = await pool.query(
    `SELECT id, title, cover_image_url, body_blocks, layout, sort_order, created_at, updated_at,
            ${SHARE_REWARD_COLS}
     FROM member_public_posts
     WHERE user_id = $1
     ORDER BY sort_order ASC, created_at DESC`,
    [userId]
  );
  return r.rows.map((row) => rowToPost(row, { forOwner: true })).filter(Boolean);
}

/**
 * @param {string} userId
 * @param {{ title: string, coverImageUrl?: string|null, bodyBlocks?: unknown[], layout?: string, sortOrder?: number }} body
 */
async function createForUser(userId, body) {
  const title = sanitizeTitle(body.title);
  if (!title) {
    const e = new Error("กรุณากรอกหัวข้อ");
    e.code = "VALIDATION";
    throw e;
  }
  const cover = sanitizeCoverUrl(body.coverImageUrl);
  const blocks = sanitizeBodyBlocks(body.bodyBlocks);
  const layout = normalizeLayout(body.layout);
  let sortOrder = Math.floor(Number(body.sortOrder));
  if (!Number.isFinite(sortOrder)) sortOrder = 0;
  sortOrder = Math.max(0, Math.min(MAX_SORT, sortOrder));

  const pool = requirePool();
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO member_public_posts (
      id, user_id, title, cover_image_url, body_blocks, layout, sort_order, updated_at
    ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, NOW())`,
    [id, userId, title, cover, JSON.stringify(blocks), layout, sortOrder]
  );
  const get = await pool.query(
    `SELECT id, title, cover_image_url, body_blocks, layout, sort_order, created_at, updated_at,
            ${SHARE_REWARD_COLS}
     FROM member_public_posts WHERE id = $1`,
    [id]
  );
  return rowToPost(get.rows[0], { forOwner: true });
}

/**
 * @param {string} userId
 * @param {string} postId
 */
async function getForUser(userId, postId) {
  if (!UUID_RE.test(String(postId || "").trim())) return null;
  const pool = requirePool();
  const r = await pool.query(
    `SELECT id, title, cover_image_url, body_blocks, layout, sort_order, created_at, updated_at,
            ${SHARE_REWARD_COLS}
     FROM member_public_posts WHERE id = $1 AND user_id = $2`,
    [postId, userId]
  );
  return rowToPost(r.rows[0], { forOwner: true });
}

/**
 * @param {string} userId
 * @param {string} postId
 * @param {object} body
 */
async function updateForUser(userId, postId, body) {
  if (!UUID_RE.test(String(postId || "").trim())) {
    const e = new Error("รูปแบบรหัสโพสต์ไม่ถูกต้อง");
    e.code = "VALIDATION";
    throw e;
  }
  const pool = requirePool();
  const cur = await pool.query(
    `SELECT id, user_id, title, cover_image_url, body_blocks, layout, sort_order
     FROM member_public_posts WHERE id = $1`,
    [postId]
  );
  const row = cur.rows[0];
  if (!row) {
    const e = new Error("ไม่พบโพสต์");
    e.code = "NOT_FOUND";
    throw e;
  }
  if (String(row.user_id) !== String(userId)) {
    const e = new Error("ไม่มีสิทธิ์แก้ไขโพสต์นี้");
    e.code = "FORBIDDEN";
    throw e;
  }

  let title = row.title;
  if (Object.prototype.hasOwnProperty.call(body, "title")) {
    title = sanitizeTitle(body.title);
    if (!title) {
      const e = new Error("กรุณากรอกหัวข้อ");
      e.code = "VALIDATION";
      throw e;
    }
  }

  let cover = row.cover_image_url;
  if (Object.prototype.hasOwnProperty.call(body, "coverImageUrl")) {
    cover = sanitizeCoverUrl(body.coverImageUrl);
  }

  let blocks = sanitizeBodyBlocks(row.body_blocks);
  if (Object.prototype.hasOwnProperty.call(body, "bodyBlocks")) {
    blocks = sanitizeBodyBlocks(body.bodyBlocks);
  }

  let layout = row.layout;
  if (Object.prototype.hasOwnProperty.call(body, "layout")) {
    layout = normalizeLayout(body.layout);
  }

  let sortOrder = Number(row.sort_order) || 0;
  if (Object.prototype.hasOwnProperty.call(body, "sortOrder")) {
    let n = Math.floor(Number(body.sortOrder));
    if (!Number.isFinite(n)) n = 0;
    sortOrder = Math.max(0, Math.min(MAX_SORT, n));
  }

  await pool.query(
    `UPDATE member_public_posts SET
      title = $2,
      cover_image_url = $3,
      body_blocks = $4::jsonb,
      layout = $5,
      sort_order = $6,
      updated_at = NOW()
     WHERE id = $1`,
    [postId, title, cover, JSON.stringify(blocks), layout, sortOrder]
  );

  const get = await pool.query(
    `SELECT id, title, cover_image_url, body_blocks, layout, sort_order, created_at, updated_at,
            ${SHARE_REWARD_COLS}
     FROM member_public_posts WHERE id = $1`,
    [postId]
  );
  return rowToPost(get.rows[0], { forOwner: true });
}

/**
 * @param {string} userId
 * @param {string} postId
 */
async function deleteForUser(userId, postId) {
  if (!UUID_RE.test(String(postId || "").trim())) {
    const e = new Error("รูปแบบรหัสโพสต์ไม่ถูกต้อง");
    e.code = "VALIDATION";
    throw e;
  }
  const pool = requirePool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cur = await client.query(
      `SELECT user_id, share_red_status, share_red_pool_remaining
       FROM member_public_posts WHERE id = $1 FOR UPDATE`,
      [postId]
    );
    const row = cur.rows[0];
    if (!row || String(row.user_id) !== String(userId)) {
      const e = new Error("ไม่พบโพสต์หรือไม่มีสิทธิ์ลบ");
      e.code = "NOT_FOUND";
      throw e;
    }
    const st = String(row.share_red_status || "off");
    const poolRem = Math.floor(Number(row.share_red_pool_remaining) || 0);
    if (st === "active" && poolRem > 0) {
      await userService.adjustDualHeartsWithClient(client, userId, 0, poolRem, {
        kind: "public_post_share_delete_refund",
        label: "คืนหัวใจแดงที่กันไว้ (ลบโพสต์)",
        meta: { postId }
      });
    }
    const del = await client.query(
      `DELETE FROM member_public_posts WHERE id = $1 AND user_id = $2 RETURNING id`,
      [postId, userId]
    );
    if (del.rowCount === 0) {
      const e = new Error("ไม่พบโพสต์หรือไม่มีสิทธิ์ลบ");
      e.code = "NOT_FOUND";
      throw e;
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
  return { ok: true };
}

module.exports = {
  listPublicByUsername,
  getPublicByUsernameAndPostId,
  listByUserId,
  getForUser,
  createForUser,
  updateForUser,
  deleteForUser,
  sanitizeBodyBlocks,
  sanitizeTitle
};
