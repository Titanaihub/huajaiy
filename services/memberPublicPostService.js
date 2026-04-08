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

  let visitorMessage = null;
  if (status === "active" && per > 0) {
    /** ข้อความรางวัลฝั่งผู้เยี่ยมชมใช้ redPerMember + maxRecipientSlots ใน UI — ไม่ส่งยาวที่นี่ */
    visitorMessage = null;
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
  const post = {
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
  if (Object.prototype.hasOwnProperty.call(row, "owner_public_page_heart_accent")) {
    const tint = userService.sanitizePublicPageHeartAccent(row.owner_public_page_heart_accent);
    if (tint) post.shareRewardHeartTint = tint;
  }
  return post;
}

/**
 * @param {string} username
 */
/**
 * รูปปกโพสต์ล่าสุดสำหรับหน้าแรก — เฉพาะเพจที่ public_page_listed และมีรูปปก https
 * ไม่ส่งชื่อจริง/หัวข้อโพสต์ (แค่ username + postId สำหรับลิงก์)
 * @param {number} [limit]
 */
/**
 * ข้อความย่อจากบล็อกแรก (paragraph)
 * @param {unknown} blocks
 * @param {number} [maxLen]
 */
function excerptFromBodyBlocks(blocks, maxLen = 200) {
  if (!Array.isArray(blocks)) return "";
  const cap = Math.min(800, Math.max(40, Math.floor(Number(maxLen) || 200)));
  for (const b of blocks) {
    if (!b || typeof b !== "object") continue;
    if (String(b.type || "").toLowerCase() !== "paragraph") continue;
    const text = String(b.text ?? "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    return text.length > cap ? `${text.slice(0, cap - 1)}…` : text;
  }
  return "";
}

/**
 * รูปแรกในเนื้อหา (https)
 * @param {unknown} blocks
 */
function firstHttpsImageFromBodyBlocks(blocks) {
  if (!Array.isArray(blocks)) return null;
  for (const b of blocks) {
    if (!b || typeof b !== "object") continue;
    if (String(b.type || "").toLowerCase() !== "image") continue;
    const url = String(b.url || "").trim();
    if (/^https:\/\//i.test(url) && url.length <= 1024) return url;
  }
  return null;
}

/**
 * โพสต์สมาชิกล่าสุดสำหรับหน้าแรก — เพจที่ public_page_listed
 * @param {number} [limit]
 * @returns {Promise<Array<{ postId: string, username: string, pageDisplayName: string, title: string, excerpt: string, coverImageUrl: string|null, createdAt: string|null }>>}
 */
async function listRecentPublicPostsForHome(limit = 6) {
  let pool;
  try {
    pool = requirePool();
  } catch (e) {
    if (e && e.code === "DB_REQUIRED") return [];
    throw e;
  }
  const lim = Math.min(12, Math.max(1, Math.floor(Number(limit) || 6)));
  const r = await pool.query(
    `SELECT p.id, p.title, p.cover_image_url, p.body_blocks, p.created_at, p.updated_at,
            u.username, u.public_page_title,
            p.share_red_per_member, p.share_red_pool_remaining, p.share_red_initial_budget,
            p.share_red_status, p.share_red_recipients_count,
            u.public_page_heart_accent AS owner_public_page_heart_accent
     FROM member_public_posts p
     INNER JOIN users u ON u.id = p.user_id
     WHERE u.account_disabled = false
       AND COALESCE(u.role, 'member') <> 'admin'
       AND u.public_page_listed = true
     ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC NULLS LAST
     LIMIT $1`,
    [lim]
  );
  return r.rows
    .map((row) => {
      const post = rowToPost(row);
      if (!post) return null;
      const un = String(row.username || "")
        .trim()
        .toLowerCase();
      const id = row.id != null ? String(row.id).trim() : "";
      if (!un || !UUID_RE.test(id)) return null;
      const pageTitleRaw = row.public_page_title != null ? String(row.public_page_title).trim() : "";
      const pageDisplayName = pageTitleRaw || un;
      const excerpt = excerptFromBodyBlocks(post.bodyBlocks);
      let cover = sanitizeCoverUrl(row.cover_image_url);
      if (!cover) cover = firstHttpsImageFromBodyBlocks(post.bodyBlocks);
      const title = String(post.title || "").trim() || "โพสต์";
      const heartTint = userService.sanitizePublicPageHeartAccent(row.owner_public_page_heart_accent);
      return {
        postId: id,
        username: un,
        pageDisplayName,
        title,
        excerpt,
        coverImageUrl: cover,
        createdAt:
          row.created_at instanceof Date
            ? row.created_at.toISOString()
            : row.created_at
              ? String(row.created_at)
              : null,
        shareReward: shareRewardPayload(row, { forOwner: false }),
        shareRewardHeartTint: heartTint || null
      };
    })
    .filter(Boolean);
}

async function listRecentPublicPostCoversForHome(limit = 12) {
  let pool;
  try {
    pool = requirePool();
  } catch (e) {
    if (e && e.code === "DB_REQUIRED") return [];
    throw e;
  }
  const lim = Math.min(24, Math.max(1, Math.floor(Number(limit) || 12)));
  const r = await pool.query(
    `SELECT p.id, u.username, p.cover_image_url
     FROM member_public_posts p
     INNER JOIN users u ON u.id = p.user_id
     WHERE u.account_disabled = false
       AND COALESCE(u.role, 'member') <> 'admin'
       AND u.public_page_listed = true
       AND p.cover_image_url IS NOT NULL
       AND TRIM(p.cover_image_url) <> ''
       AND p.cover_image_url LIKE 'https://%'
     ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC NULLS LAST
     LIMIT $1`,
    [lim]
  );
  return r.rows
    .map((row) => {
      const cover = sanitizeCoverUrl(row.cover_image_url);
      const un = String(row.username || "")
        .trim()
        .toLowerCase();
      const id = row.id != null ? String(row.id).trim() : "";
      if (!cover || !un || !UUID_RE.test(id)) return null;
      return { postId: id, username: un, coverImageUrl: cover };
    })
    .filter(Boolean);
}

async function listPublicByUsername(username) {
  const pool = requirePool();
  const un = String(username || "").toLowerCase().trim();
  const r = await pool.query(
    `SELECT p.id, p.title, p.cover_image_url, p.body_blocks, p.layout, p.sort_order, p.created_at, p.updated_at,
            p.share_red_per_member, p.share_red_pool_remaining, p.share_red_initial_budget,
            p.share_red_status, p.share_red_recipients_count,
            u.public_page_heart_accent AS owner_public_page_heart_accent
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
            p.share_red_status, p.share_red_recipients_count,
            u.public_page_heart_accent AS owner_public_page_heart_accent
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
  listRecentPublicPostCoversForHome,
  listRecentPublicPostsForHome,
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
