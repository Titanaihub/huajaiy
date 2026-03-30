const { getPool } = require("../db/pool");
const userService = require("./userService");
const roomRedGiftService = require("./roomRedGiftService");

const AUNYAWEE_USERNAME = "aunyawee";
const PHONG_USERNAME = "phongphiphat47";
const AUNYAWEE_SUBTRACT_GIVEAWAY = 4999;
const AUNYAWEE_ADD_PLAYABLE_RED = 1;

/**
 * ดูก่อนรันว่ามีแถวอะไรใน DB (ไม่แก้ข้อมูล)
 */
async function previewMarch2026AunyaweePhongCleanup() {
  const pool = getPool();
  if (!pool) {
    const e = new Error("ต้องใช้ PostgreSQL (DATABASE_URL)");
    e.code = "DB_REQUIRED";
    throw e;
  }
  const au = await userService.findByUsername(AUNYAWEE_USERNAME);
  const ph = await userService.findByUsername(PHONG_USERNAME);
  const hint = await pool.query(
    `SELECT id, username FROM users
     WHERE username ILIKE $1 OR username ILIKE $2 OR username ILIKE $3
     ORDER BY username`,
    ["%aunyawee%", "%phong%", "%phiphat%"]
  );
  async function n(q, params) {
    const r = await pool.query(q, params);
    return Math.max(0, Number(r.rows[0]?.c) || 0);
  }
  if (!au || !ph) {
    return {
      ok: true,
      preview: true,
      foundAunyawee: au ? { id: au.id, username: au.username } : null,
      foundPhong: ph ? { id: ph.id, username: ph.username } : null,
      hintUsers: hint.rows.map((row) => ({
        id: row.id,
        username: row.username
      })),
      note:
        "ไม่พบยูสเซอร์ตามชื่อที่ฮาร์ดโค้ด — ดู hintUsers ว่าใน DB เขียนต่างจาก aunyawee / phongphiphat47 หรือไม่"
    };
  }
  const auId = au.id;
  const phId = ph.id;
  const ledgerKinds = await pool.query(
    `SELECT kind, COUNT(*)::int AS c FROM heart_ledger WHERE user_id = $1::uuid GROUP BY kind ORDER BY kind`,
    [auId]
  );
  return {
    ok: true,
    preview: true,
    foundAunyawee: { id: auId, username: au.username },
    foundPhong: { id: phId, username: ph.username },
    counts: {
      aunyaweeHeartPurchases: await n(
        `SELECT COUNT(*)::int AS c FROM heart_purchases WHERE user_id = $1::uuid`,
        [auId]
      ),
      aunyaweeHeartLedgerRows: await n(
        `SELECT COUNT(*)::int AS c FROM heart_ledger WHERE user_id = $1::uuid`,
        [auId]
      ),
      aunyaweeLedgerByKind: ledgerKinds.rows,
      aunyaweePrizeAwards: await n(
        `SELECT COUNT(*)::int AS c FROM central_prize_awards WHERE winner_user_id = $1::uuid`,
        [auId]
      ),
      aunyaweeUserRoomRedBalanceRows: await n(
        `SELECT COUNT(*)::int AS c FROM user_room_red_balance WHERE user_id = $1::uuid`,
        [auId]
      ),
      phongUserRoomRedBalanceRows: await n(
        `SELECT COUNT(*)::int AS c FROM user_room_red_balance WHERE user_id = $1::uuid`,
        [phId]
      ),
      roomRedBalanceRowsAsCreatorAunyawee: await n(
        `SELECT COUNT(*)::int AS c FROM user_room_red_balance WHERE creator_id = $1::uuid`,
        [auId]
      ),
      roomRedBalanceRowsAsCreatorPhong: await n(
        `SELECT COUNT(*)::int AS c FROM user_room_red_balance WHERE creator_id = $1::uuid`,
        [phId]
      ),
      phongHeartLedgerRows: await n(
        `SELECT COUNT(*)::int AS c FROM heart_ledger WHERE user_id = $1::uuid`,
        [phId]
      ),
      phongHeartPurchases: await n(
        `SELECT COUNT(*)::int AS c FROM heart_purchases WHERE user_id = $1::uuid`,
        [phId]
      ),
      phongPrizeAwards: await n(
        `SELECT COUNT(*)::int AS c FROM central_prize_awards WHERE winner_user_id = $1::uuid`,
        [phId]
      ),
      withdrawalRequestsTouchingEither: await n(
        `SELECT COUNT(*)::int AS c FROM central_prize_withdrawal_requests
         WHERE requester_user_id = ANY($1::uuid[]) OR creator_user_id = ANY($1::uuid[])`,
        [[auId, phId]]
      ),
      phongRoomCodesAsCreator: await n(
        `SELECT COUNT(*)::int AS c FROM room_red_gift_codes WHERE creator_id = $1::uuid`,
        [phId]
      ),
      aunyaweeRoomCodesAsCreator: await n(
        `SELECT COUNT(*)::int AS c FROM room_red_gift_codes WHERE creator_id = $1::uuid`,
        [auId]
      )
    },
    hintUsers: hint.rows.map((row) => ({
      id: row.id,
      username: row.username
    }))
  };
}

/**
 * One-off: ลบข้อมูลตามคำขอ aunyawee + phongphiphat47 (มีแอดมิน + คีย์ env หรือรันสคริปต์)
 * รวม ledger/purchases/รางวัล/ยอดห้อง (ทั้งฝั่ง user และ creator) และคำขอถอนรางวัลที่เกี่ยวทั้งสองคน
 * @param {{ forceAunyaweeBalanceAdjust?: boolean }} [options]
 * @returns {Promise<{ ok: true, phongCodesDeleted: string[], aunyaweeCodesDeleted: string[], sql: object }>}
 */
async function runMarch2026AunyaweePhongCleanup(options = {}) {
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
    withdrawalRequestsDeleted: 0,
    prizeAwardsDeleted: 0,
    ledgerDeleted: 0,
    purchasesDeleted: 0,
    roomRedBalanceRowsDeleted: 0,
    balanceAdjusted: false,
    aunyaweeBalances: null
  };

  try {
    await client.query("BEGIN");

    const delWd = await client.query(
      `DELETE FROM central_prize_withdrawal_requests
       WHERE requester_user_id = ANY($1::uuid[]) OR creator_user_id = ANY($1::uuid[])`,
      [[auId, phId]]
    );
    sql.withdrawalRequestsDeleted = delWd.rowCount;

    const delAwards = await client.query(
      `DELETE FROM central_prize_awards WHERE winner_user_id = ANY($1::uuid[])`,
      [[auId, phId]]
    );
    sql.prizeAwardsDeleted = delAwards.rowCount;

    const delLedger = await client.query(
      `DELETE FROM heart_ledger WHERE user_id = ANY($1::uuid[])`,
      [[auId, phId]]
    );
    sql.ledgerDeleted = delLedger.rowCount;

    const delPurchases = await client.query(
      `DELETE FROM heart_purchases WHERE user_id = ANY($1::uuid[])`,
      [[auId, phId]]
    );
    sql.purchasesDeleted = delPurchases.rowCount;

    const delRoomBal = await client.query(
      `DELETE FROM user_room_red_balance
       WHERE user_id = ANY($1::uuid[]) OR creator_id = ANY($1::uuid[])`,
      [[auId, phId]]
    );
    sql.roomRedBalanceRowsDeleted = delRoomBal.rowCount;

    const touched =
      sql.withdrawalRequestsDeleted +
      sql.prizeAwardsDeleted +
      sql.ledgerDeleted +
      sql.purchasesDeleted +
      sql.roomRedBalanceRowsDeleted;

    const forceBal = Boolean(options.forceAunyaweeBalanceAdjust);
    if (touched === 0 && !forceBal) {
      sql.balanceAdjusted = false;
      sql.note =
        "ไม่มีแถวให้ลบในรอบนี้ — ข้ามการปรับยอด aunyawee · ถ้าต้องการปรับยอดบังคับ ส่ง JSON forceAunyaweeBalanceAdjust: true (ระวังรันซ้ำ)";
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
  previewMarch2026AunyaweePhongCleanup,
  AUNYAWEE_USERNAME,
  PHONG_USERNAME
};
