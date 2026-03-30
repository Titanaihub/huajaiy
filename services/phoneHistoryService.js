const crypto = require("crypto");
const { getPool } = require("../db/pool");
const userStore = require("../userStore");

/**
 * @param {import("pg").PoolClient} client
 * @param {{ userId: string; oldPhone: string; newPhone: string; clientIp?: string | null }} row
 */
async function insertWithClient(client, row) {
  const id = crypto.randomUUID();
  const ip =
    row.clientIp == null ? null : String(row.clientIp).slice(0, 64);
  await client.query(
    `INSERT INTO user_phone_history (id, user_id, old_phone, new_phone, client_ip)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, row.userId, row.oldPhone, row.newPhone, ip]
  );
}

async function listForUser(userId) {
  const pool = getPool();
  if (!pool) {
    const u = userStore.findById(userId);
    const h = Array.isArray(u?.phoneHistory) ? u.phoneHistory : [];
    return [...h]
      .reverse()
      .map((x, i) => ({
        id: `local-${i}-${x.changedAt || i}`,
        oldPhone: x.oldPhone,
        newPhone: x.newPhone,
        changedAt: x.changedAt,
        clientIp: x.clientIp ?? null
      }));
  }
  const r = await pool.query(
    `SELECT id, old_phone, new_phone, changed_at, client_ip
     FROM user_phone_history
     WHERE user_id = $1
     ORDER BY changed_at DESC`,
    [userId]
  );
  return r.rows.map((row) => ({
    id: row.id,
    oldPhone: row.old_phone,
    newPhone: row.new_phone,
    changedAt: row.changed_at,
    clientIp: row.client_ip
  }));
}

module.exports = {
  insertWithClient,
  listForUser
};
