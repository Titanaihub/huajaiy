const { getPool } = require("../db/pool");
const userService = require("./userService");
const roomRedGiftService = require("./roomRedGiftService");

const AUNYAWEE_USERNAME = "aunyawee";
const PHONG_USERNAME = "phongphiphat47";
const AUNYAWEE_SUBTRACT_GIVEAWAY = 4999;
const AUNYAWEE_ADD_PLAYABLE_RED = 1;

const LEDGER_KINDS_AUNYAWEE = [
  "heart_purchase_approved",
  "game_start",
  "room_red_code_issue",
  "room_red_code_refund"
];

/**
 * One-off: ลบข้อมูลตามคำขอ aunyawee + phongphiphat47 (มีแอดมิน + คีย์ env หรือรันสคริปต์)
 * ไม่เรียก pool.end() — ใช้จาก server ได้
 * @returns {Promise<{ ok: true, phongCodesDeleted: string[], aunyaweeCodesDeleted: string[], sql: object }>}
 */
async function runMarch2026AunyaweePhongCleanup() {
  const pool = getPool();
  if (!pool) {
    const e = new Error("ต้องใช้ PostgreSQL (DATABASE_URL)");
    e.code = "DB_REQUIRED";
    throw e;
  }

  const au = await userService.findByUsername(AUNYAWEE_USERNAME);
  const ph = await userService.findByUsername(PHONG_USERNAME);
  if (!au) {
    const e = new Error(`ไม่พบผู้ใช้ ${AUNYAWEE_USERNAME}`);
    e.code = "NOT_FOUND";
    throw e;
  }
  if (!ph) {
    const e = new Error(`ไม่พบผู้ใช้ ${PHONG_USERNAME}`);
    e.code = "NOT_FOUND";
    throw e;
  }

  const auId = au.id;
  const phId = ph.id;

  const phCodesDeleted = [];
  const phCodes = await roomRedGiftService.listCodesForCreator(phId);
  for (const c of phCodes) {
    await roomRedGiftService.deleteCodeByCreator(phId, c.id);
    phCodesDeleted.push(c.code);
  }

  const auCodesDeleted = [];
  const auCodes = await roomRedGiftService.listCodesForCreator(auId);
  for (const c of auCodes) {
    await roomRedGiftService.deleteCodeByCreator(auId, c.id);
    auCodesDeleted.push(c.code);
  }

  const client = await pool.connect();
  const sql = {
    prizeAwardsDeleted: 0,
    ledgerDeleted: 0,
    purchasesDeleted: 0,
    roomRedBalanceRowsDeleted: 0,
    balanceAdjusted: false,
    aunyaweeBalances: null
  };

  try {
    await client.query("BEGIN");

    const delAwards = await client.query(
      `DELETE FROM central_prize_awards WHERE winner_user_id = $1::uuid`,
      [auId]
    );
    sql.prizeAwardsDeleted = delAwards.rowCount;

    const delLedger = await client.query(
      `DELETE FROM heart_ledger
       WHERE user_id = $1::uuid AND kind = ANY($2::varchar[])`,
      [auId, LEDGER_KINDS_AUNYAWEE]
    );
    sql.ledgerDeleted = delLedger.rowCount;

    const delPurchases = await client.query(
      `DELETE FROM heart_purchases WHERE user_id = $1::uuid`,
      [auId]
    );
    sql.purchasesDeleted = delPurchases.rowCount;

    const delRoomBal = await client.query(
      `DELETE FROM user_room_red_balance WHERE user_id = $1::uuid`,
      [auId]
    );
    sql.roomRedBalanceRowsDeleted = delRoomBal.rowCount;

    const touched =
      sql.prizeAwardsDeleted +
      sql.ledgerDeleted +
      sql.purchasesDeleted +
      sql.roomRedBalanceRowsDeleted;

    if (touched === 0) {
      sql.balanceAdjusted = false;
      sql.note =
        "ไม่มีแถวให้ลบในรอบนี้ — ข้ามการปรับยอด aunyawee (กันหัก 4999 ซ้ำเมื่อรันครั้งสอง)";
    } else {
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
      sql.balanceAdjusted = true;
      sql.aunyaweeBalances = {
        before: { pink, red, giveaway: give },
        after: { pink, red: newRed, giveaway: newGive }
      };
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

  return {
    ok: true,
    users: { aunyawee: auId, phongphiphat47: phId },
    phongCodesDeleted,
    aunyaweeCodesDeleted,
    sql
  };
}

module.exports = {
  runMarch2026AunyaweePhongCleanup,
  AUNYAWEE_USERNAME,
  PHONG_USERNAME
};
