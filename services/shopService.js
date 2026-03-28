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

module.exports = { listByOwner };
