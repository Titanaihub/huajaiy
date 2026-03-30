/**
 * ตั้งยอดหัวใจชมพู / แดงเล่นได้ / แดงแจก ให้สมาชิกตาม username (ครั้งเดียว — ฉุกเฉิน)
 *
 * ต้องมี DATABASE_URL
 *
 * รัน (เครื่องหรือ Render Shell):
 *   CONFIRM_SET_HEARTS=ZERO_AUNYAWEE_NOW node scripts/set-member-hearts-exact.js aunyawee 0 0 0
 *
 * อาร์กิวเมนต์: username pink redPlayable redGiveaway (ตัวเลข ≥ 0)
 */
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env")
});

const { getPool } = require("../db/pool");

const REQUIRED_CONFIRM = "ZERO_AUNYAWEE_NOW";

(async () => {
  const pool = getPool();
  if (!pool) {
    console.error("[set-hearts] ต้องมี DATABASE_URL");
    process.exitCode = 1;
    return;
  }
  if (String(process.env.CONFIRM_SET_HEARTS || "") !== REQUIRED_CONFIRM) {
    console.error(
      `[set-hearts] ตั้ง CONFIRM_SET_HEARTS=${REQUIRED_CONFIRM} ก่อนรัน (กันพลาด)`
    );
    process.exitCode = 1;
    return;
  }
  const username = String(process.argv[2] || "").trim().toLowerCase();
  const pink = Math.max(0, Math.floor(Number(process.argv[3]) || 0));
  const redPlay = Math.max(0, Math.floor(Number(process.argv[4]) || 0));
  const redGive = Math.max(0, Math.floor(Number(process.argv[5]) || 0));
  if (!username) {
    console.error("[set-hearts] ใช้: node scripts/set-member-hearts-exact.js <username> <pink> <redPlayable> <redGiveaway>");
    process.exitCode = 1;
    return;
  }
  const sum = pink + redPlay + redGive;
  try {
    const r = await pool.query(
      `UPDATE users SET
        pink_hearts_balance = $2,
        red_hearts_balance = $3,
        red_giveaway_balance = $4,
        hearts_balance = $2::integer + $3::integer + $4::integer
       WHERE username = $1
       RETURNING id, username`,
      [username, pink, redPlay, redGive]
    );
    if (r.rowCount === 0) {
      console.error(`[set-hearts] ไม่พบ username: ${username}`);
      process.exitCode = 1;
      return;
    }
    console.log("[set-hearts] สำเร็จ:", r.rows[0], {
      pink,
      redPlayable: redPlay,
      redGiveaway: redGive,
      heartsTotal: sum
    });
  } catch (e) {
    console.error("[set-hearts] ล้มเหลว:", e.message);
    process.exitCode = 1;
  } finally {
    await pool.end().catch(() => {});
  }
})();
