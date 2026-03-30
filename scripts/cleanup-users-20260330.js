/**
 * ลบข้อมูลตามคำขอ one-off (aunyawee / phongphiphat47)
 *
 * aunyawee:
 *   - ลบประวัติซื้อหัวใจ (heart_purchases)
 *   - ลบแถว ledger ที่เกี่ยวกับซื้อ / เล่น / แจกรหัสห้อง
 *   - ลบประวัติได้รางวัลเกมส่วนกลาง (central_prize_awards)
 *   - ลบยอดแดงห้องคงค้างของผู้ใช้ (user_room_red_balance ฝั่งผู้เล่น)
 *   - ลบรหัสแจกห้องที่ผู้ใช้นี้เป็นคนสร้าง (คืนทุนตาม logic deleteCodeByCreator)
 *   - ปรับยอด: ลดแดงแจก 4999, คืนแดงเล่นได้ +1 (ตามที่แอดมินระบุจากเคสจริง)
 *
 * phongphiphat47:
 *   - ลบรหัสแจกห้องที่สมาชิกนี้สร้างทั้งหมด (คืนทุนส่วนที่ยังไม่ถูกใช้)
 *
 * รัน: จากรากโปรเจกต์ หลังตั้ง DATABASE_URL ใน .env
 *   node scripts/cleanup-users-20260330.js
 *
 * ตรวจยอดหัวใจหลังรันในแอดมิน — ถ้าเคสจริงต่างจากสมมติฐาน แก้ค่าคงที่ด้านล่างแล้วรันใหม่
 * (ลบ ledger แล้ว — รันซ้ำอาจ double-adjust ถ้าไม่ wrap ด้วย guard)
 */
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env")
});

const { getPool } = require("../db/pool");
const userService = require("../services/userService");
const roomRedGiftService = require("../services/roomRedGiftService");

const AUNYAWEE_USERNAME = "aunyawee";
const PHONG_USERNAME = "phongphiphat47";
/** ลด red_giveaway_balance สูงสุดเท่านี้ (ไม่ติดลบ) */
const AUNYAWEE_SUBTRACT_GIVEAWAY = 4999;
/** คืน red_hearts_balance (แดงเล่นได้) หลังลบ game_start */
const AUNYAWEE_ADD_PLAYABLE_RED = 1;

const LEDGER_KINDS_AUNYAWEE = [
  "heart_purchase_approved",
  "game_start",
  "room_red_code_issue",
  "room_red_code_refund"
];

async function main() {
  const pool = getPool();
  if (!pool) {
    console.error("ต้องการ DATABASE_URL");
    process.exitCode = 1;
    return;
  }

  const au = await userService.findByUsername(AUNYAWEE_USERNAME);
  const ph = await userService.findByUsername(PHONG_USERNAME);
  if (!au) {
    console.error("ไม่พบผู้ใช้", AUNYAWEE_USERNAME);
    process.exitCode = 1;
    return;
  }
  if (!ph) {
    console.error("ไม่พบผู้ใช้", PHONG_USERNAME);
    process.exitCode = 1;
    return;
  }

  const auId = au.id;
  const phId = ph.id;

  console.log("[cleanup] aunyawee id=", auId);
  console.log("[cleanup] phongphiphat47 id=", phId);

  // --- phongphiphat47: ลบรหัสที่สร้าง (คืนทุนอัตโนมัติ) ---
  const phCodes = await roomRedGiftService.listCodesForCreator(phId);
  console.log("[cleanup] phong codes count:", phCodes.length);
  for (const c of phCodes) {
    const r = await roomRedGiftService.deleteCodeByCreator(phId, c.id);
    console.log("[cleanup] deleted code", c.code, r);
  }

  // --- aunyawee: รหัสที่ตัวเองสร้าง ---
  const auCodes = await roomRedGiftService.listCodesForCreator(auId);
  console.log("[cleanup] aunyawee codes count:", auCodes.length);
  for (const c of auCodes) {
    const r = await roomRedGiftService.deleteCodeByCreator(auId, c.id);
    console.log("[cleanup] deleted code", c.code, r);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const delAwards = await client.query(
      `DELETE FROM central_prize_awards WHERE winner_user_id = $1::uuid`,
      [auId]
    );
    console.log("[cleanup] central_prize_awards deleted:", delAwards.rowCount);

    const delLedger = await client.query(
      `DELETE FROM heart_ledger
       WHERE user_id = $1::uuid AND kind = ANY($2::varchar[])`,
      [auId, LEDGER_KINDS_AUNYAWEE]
    );
    console.log("[cleanup] heart_ledger deleted:", delLedger.rowCount);

    const delPurchases = await client.query(
      `DELETE FROM heart_purchases WHERE user_id = $1::uuid`,
      [auId]
    );
    console.log("[cleanup] heart_purchases deleted:", delPurchases.rowCount);

    const delRoomBal = await client.query(
      `DELETE FROM user_room_red_balance WHERE user_id = $1::uuid`,
      [auId]
    );
    console.log("[cleanup] user_room_red_balance (as player) deleted:", delRoomBal.rowCount);

    const balR = await client.query(
      `SELECT pink_hearts_balance, red_hearts_balance, COALESCE(red_giveaway_balance,0) AS g
       FROM users WHERE id = $1::uuid FOR UPDATE`,
      [auId]
    );
    if (balR.rows.length === 0) throw new Error("aunyawee row missing");
    const pink = Math.max(0, Math.floor(Number(balR.rows[0].pink_hearts_balance) || 0));
    const red = Math.max(0, Math.floor(Number(balR.rows[0].red_hearts_balance) || 0));
    const give = Math.max(0, Math.floor(Number(balR.rows[0].g) || 0));
    const newGive = Math.max(0, give - AUNYAWEE_SUBTRACT_GIVEAWAY);
    const newRed = red + AUNYAWEE_ADD_PLAYABLE_RED;
    await client.query(
      `UPDATE users SET
        red_giveaway_balance = $2,
        red_hearts_balance = $3,
        hearts_balance = $4 + $3 + $2
       WHERE id = $1::uuid`,
      [auId, newGive, newRed, pink]
    );
    console.log("[cleanup] aunyawee balances:", {
      before: { pink, red, giveaway: give },
      after: { pink, red: newRed, giveaway: newGive }
    });

    await client.query("COMMIT");
    console.log("[cleanup] เสร็จสมบูรณ์");
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    console.error("[cleanup] ล้มเหลว:", e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end().catch(() => {});
  }
}

main();
