const crypto = require("crypto");
const { getPool } = require("../db/pool");

/** รายการร้านที่ user เป็นเจ้าของ — ไม่มี DB คืน [] */
async function listByOwner(ownerUserId) {
  const pool = getPool();
  if (!pool) return [];
  const r = await pool.query(
    `SELECT id, slug, name, created_at AS "createdAt"
     FROM shops WHERE owner_user_id = $1 ORDER BY created_at ASC`,
    [ownerUserId]
  );
  return r.rows;
}

/** แอดมิน — ร้านทั้งหมดพร้อมเจ้าของ */
async function listAllForAdmin() {
  const pool = getPool();
  if (!pool) return [];
  const r = await pool.query(`
    SELECT s.id, s.slug, s.name, s.owner_user_id AS "ownerUserId",
           s.created_at AS "createdAt", u.username AS "ownerUsername"
    FROM shops s
    LEFT JOIN users u ON u.id = s.owner_user_id
    ORDER BY s.created_at DESC
  `);
  return r.rows;
}

async function getById(shopId) {
  const pool = getPool();
  if (!pool) return null;
  const r = await pool.query(
    `SELECT id, slug, name, owner_user_id AS "ownerUserId", created_at AS "createdAt"
     FROM shops WHERE id = $1`,
    [shopId]
  );
  return r.rows[0] || null;
}

/** เจ้าของร้านหรือแอดมิน */
function canManageShop(userId, shop, userRole) {
  if (!shop) return false;
  if (userRole === "admin") return true;
  return shop.ownerUserId && String(shop.ownerUserId) === String(userId);
}

async function userOwnsShop(userId, shopId) {
  const shop = await getById(shopId);
  if (!shop || !shop.ownerUserId) return false;
  return String(shop.ownerUserId) === String(userId);
}

/**
 * @param {object} opts
 * @param {string} opts.name
 * @param {string} opts.slug lowercase a-z0-9-
 * @param {string|null} opts.ownerUserId
 */
async function createShop({ name, slug, ownerUserId }) {
  const pool = getPool();
  if (!pool) {
    const err = new Error("DB_REQUIRED");
    err.code = "DB_REQUIRED";
    throw err;
  }
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO shops (id, slug, name, owner_user_id)
     VALUES ($1, $2, $3, $4)`,
    [id, slug, name, ownerUserId || null]
  );
  return getById(id);
}

module.exports = {
  listByOwner,
  listAllForAdmin,
  getById,
  canManageShop,
  userOwnsShop,
  createShop
};
