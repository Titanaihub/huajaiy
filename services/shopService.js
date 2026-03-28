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

module.exports = { listByOwner, listAllForAdmin };
