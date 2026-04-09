const { getPool } = require("../db/pool");

const MAX_TITLE = 200;
const MAX_BODY = 120000;

/** slug: 2–64 ตัว a-z 0-9 - ห้ามขีดหัวท้าย */
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

const RESERVED_SLUGS = new Set([
  "api",
  "admin",
  "member",
  "account",
  "login",
  "register",
  "auth",
  "game",
  "shop",
  "cart",
  "orders",
  "search",
  "contact",
  "privacy",
  "terms",
  "p",
  "u",
  "owner",
  "hui",
  "pages",
  "posts",
  "page"
]);

function requirePool() {
  const pool = getPool();
  if (!pool) {
    const e = new Error("ต้องใช้ PostgreSQL");
    e.code = "DB_REQUIRED";
    throw e;
  }
  return pool;
}

function normalizeSlugInput(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function validateSlug(s) {
  const x = normalizeSlugInput(s);
  if (!SLUG_RE.test(x) || x.length < 2 || x.length > 64) return null;
  if (RESERVED_SLUGS.has(x)) return null;
  return x;
}

function truncTitle(t) {
  return String(t || "")
    .trim()
    .slice(0, MAX_TITLE);
}

function truncBody(b) {
  return String(b ?? "").slice(0, MAX_BODY);
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    body: row.body,
    published: Boolean(row.published),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function listAll() {
  const pool = requirePool();
  const r = await pool.query(
    `SELECT id, slug, title, body, published, created_at, updated_at
     FROM site_cms_pages
     ORDER BY updated_at DESC`
  );
  return r.rows.map((row) => mapRow(row));
}

async function getById(id) {
  const pool = requirePool();
  const r = await pool.query(
    `SELECT id, slug, title, body, published, created_at, updated_at
     FROM site_cms_pages WHERE id = $1::uuid`,
    [id]
  );
  return mapRow(r.rows[0]);
}

/** สาธารณะ — เฉพาะที่เผยแพร่ */
async function getPublishedBySlug(slug) {
  const s = validateSlug(slug);
  if (!s) return null;
  const pool = getPool();
  if (!pool) return null;
  const r = await pool.query(
    `SELECT slug, title, body, updated_at
     FROM site_cms_pages
     WHERE slug = $1 AND published = true`,
    [s]
  );
  const row = r.rows[0];
  if (!row) return null;
  return {
    slug: row.slug,
    title: row.title,
    body: row.body,
    updatedAt: row.updated_at
  };
}

async function createPage({ slug, title, body, published = true }) {
  const pool = requirePool();
  const s = validateSlug(slug);
  if (!s) {
    const e = new Error(
      "slug ไม่ถูกต้อง (ใช้ a-z 0-9 และขีดกลาง 2–64 ตัว ห้ามคำสงวน เช่น admin, game)");
    e.code = "VALIDATION";
    throw e;
  }
  const t = truncTitle(title);
  if (!t) {
    const e = new Error("กรุณากรอกหัวข้อ");
    e.code = "VALIDATION";
    throw e;
  }
  const b = truncBody(body);
  const pub = Boolean(published);
  const crypto = require("crypto");
  const id = crypto.randomUUID();
  try {
    await pool.query(
      `INSERT INTO site_cms_pages (id, slug, title, body, published)
       VALUES ($1::uuid, $2, $3, $4, $5)`,
      [id, s, t, b, pub]
    );
  } catch (e) {
    if (e && e.code === "23505") {
      const err = new Error("slug นี้มีอยู่แล้ว");
      err.code = "DUPLICATE_SLUG";
      throw err;
    }
    throw e;
  }
  return getById(id);
}

async function updatePage(id, { slug, title, body, published }) {
  const pool = requirePool();
  const cur = await getById(id);
  if (!cur) {
    const e = new Error("ไม่พบหน้า");
    e.code = "NOT_FOUND";
    throw e;
  }
  const nextSlug =
    slug !== undefined ? validateSlug(slug) : cur.slug;
  if (slug !== undefined && !nextSlug) {
    const e = new Error(
      "slug ไม่ถูกต้อง (ใช้ a-z 0-9 และขีดกลาง ห้ามคำสงวน)");
    e.code = "VALIDATION";
    throw e;
  }
  const nextTitle = title !== undefined ? truncTitle(title) : cur.title;
  if (!nextTitle) {
    const e = new Error("กรุณากรอกหัวข้อ");
    e.code = "VALIDATION";
    throw e;
  }
  const nextBody = body !== undefined ? truncBody(body) : cur.body;
  const nextPub =
    published !== undefined ? Boolean(published) : cur.published;

  try {
    await pool.query(
      `UPDATE site_cms_pages SET
        slug = $2,
        title = $3,
        body = $4,
        published = $5,
        updated_at = NOW()
       WHERE id = $1::uuid`,
      [id, nextSlug, nextTitle, nextBody, nextPub]
    );
  } catch (e) {
    if (e && e.code === "23505") {
      const err = new Error("slug นี้มีอยู่แล้ว");
      err.code = "DUPLICATE_SLUG";
      throw err;
    }
    throw e;
  }
  return getById(id);
}

async function deletePage(id) {
  const pool = requirePool();
  const r = await pool.query(
    `DELETE FROM site_cms_pages WHERE id = $1::uuid RETURNING id`,
    [id]
  );
  if (r.rowCount === 0) {
    const e = new Error("ไม่พบหน้า");
    e.code = "NOT_FOUND";
    throw e;
  }
  return { ok: true };
}

module.exports = {
  listAll,
  getById,
  getPublishedBySlug,
  createPage,
  updatePage,
  deletePage,
  validateSlug,
  normalizeSlugInput
};
