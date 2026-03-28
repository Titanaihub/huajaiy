const { getPool } = require("../db/pool");
const userStore = require("../userStore");
const { ADMIN } = require("../constants/roles");

/**
 * ตั้งบทบาท admin ให้ username จาก env PROMOTE_ADMIN_USERNAME
 * ใช้บน Render: สมัครสมาชิกก่อน → ใส่ username ใน Environment → deploy ครั้งหนึ่ง
 * แนะนำ: ลบหรือเว้นค่าว่างหลังตั้งแล้ว (ไม่บังคับ แต่ลดความเสี่ยง)
 */
async function promoteAdminFromEnv() {
  const raw = process.env.PROMOTE_ADMIN_USERNAME;
  if (raw == null || String(raw).trim() === "") return;

  const username = String(raw).trim().toLowerCase();
  const pool = getPool();

  if (pool) {
    const r = await pool.query(
      `UPDATE users SET role = $2 WHERE lower(username) = $1 RETURNING username`,
      [username, ADMIN]
    );
    if (r.rowCount === 0) {
      console.warn(
        `[admin] PROMOTE_ADMIN_USERNAME="${raw.trim()}" — ยังไม่มี user นี้ในฐานข้อมูล (สมัครก่อน แล้ว deploy ใหม่ หรือแก้ username)`
      );
    } else {
      console.log(`[admin] ตั้ง role=admin ให้ "${r.rows[0].username}" แล้ว (จาก PROMOTE_ADMIN_USERNAME)`);
    }
    return;
  }

  const u = userStore.findByUsername(username);
  if (!u) {
    console.warn(
      `[admin] PROMOTE_ADMIN_USERNAME="${raw.trim()}" — ไม่พบใน users.json`
    );
    return;
  }
  userStore.updateUser(u.id, { role: ADMIN });
  console.log(`[admin] ตั้ง role=admin ให้ "${u.username}" แล้ว (จาก PROMOTE_ADMIN_USERNAME)`);
}

module.exports = { promoteAdminFromEnv };
