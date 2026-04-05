const crypto = require("crypto");
const { getPool } = require("../db/pool");

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

function rowToPost(row) {
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
    updatedAt: row.updated_at
  };
}

/**
 * @param {string} username
 */
async function listPublicByUsername(username) {
  const pool = requirePool();
  const un = String(username || "").toLowerCase().trim();
  const r = await pool.query(
    `SELECT p.id, p.title, p.cover_image_url, p.body_blocks, p.layout, p.sort_order, p.created_at, p.updated_at
     FROM member_public_posts p
     JOIN users u ON u.id = p.user_id
     WHERE u.username = $1
     ORDER BY p.sort_order ASC, p.created_at DESC`,
    [un]
  );
  return r.rows.map(rowToPost).filter(Boolean);
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
    `SELECT p.id, p.title, p.cover_image_url, p.body_blocks, p.layout, p.sort_order, p.created_at, p.updated_at
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
    `SELECT id, title, cover_image_url, body_blocks, layout, sort_order, created_at, updated_at
     FROM member_public_posts
     WHERE user_id = $1
     ORDER BY sort_order ASC, created_at DESC`,
    [userId]
  );
  return r.rows.map(rowToPost).filter(Boolean);
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
    `SELECT id, title, cover_image_url, body_blocks, layout, sort_order, created_at, updated_at
     FROM member_public_posts WHERE id = $1`,
    [id]
  );
  return rowToPost(get.rows[0]);
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
    `SELECT id, title, cover_image_url, body_blocks, layout, sort_order, created_at, updated_at
     FROM member_public_posts WHERE id = $1`,
    [postId]
  );
  return rowToPost(get.rows[0]);
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
  const r = await pool.query(
    `DELETE FROM member_public_posts WHERE id = $1 AND user_id = $2 RETURNING id`,
    [postId, userId]
  );
  if (r.rowCount === 0) {
    const e = new Error("ไม่พบโพสต์หรือไม่มีสิทธิ์ลบ");
    e.code = "NOT_FOUND";
    throw e;
  }
  return { ok: true };
}

module.exports = {
  listPublicByUsername,
  getPublicByUsernameAndPostId,
  listByUserId,
  createForUser,
  updateForUser,
  deleteForUser,
  sanitizeBodyBlocks,
  sanitizeTitle
};
