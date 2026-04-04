const { getPool } = require("../db/pool");
const heartLedgerService = require("./heartLedgerService");
const userService = require("./userService");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** รหัสเกมสั้น (YYYYMMDD+ลำดับ) จาก central_games — ใส่ใน meta ledger */
async function fetchCentralGameCode(client, gameId) {
  if (!gameId) return null;
  const id = String(gameId).trim();
  if (!UUID_RE.test(id)) return null;
  const r = await client.query(
    `SELECT NULLIF(TRIM(game_code::text), '') AS gc FROM central_games WHERE id = $1::uuid`,
    [id]
  );
  const gc = r.rows[0]?.gc;
  return gc != null && String(gc).trim() ? String(gc).trim() : null;
}

/**
 * หักหัวใจเริ่มรอบเกมส่วนกลางที่เผยแพร่
 * - ชมพู: จาก users.pink เท่านั้น
 * - แดง: จากยอดแดงทั่วไป + ยอด「แดงจากรหัสห้อง」ตามกติกา:
 *   - ถ้า allowGiftRedPlay → รวมแดงจากรหัสทุกเจ้าของห้องได้
 *   - ถ้ามี gameCreatedBy → ใช้ได้เฉพาะแดงที่ผูกกับเจ้าของห้องนั้น + แดงทั่วไป
 *   - ถ้าไม่มีเจ้าของและไม่อนุญาต gift → แดงทั่วไปอย่างเดียว (เดิม)
 */
async function deductCentralGameStart(
  userId,
  {
    pinkCost = 0,
    redCost = 0,
    gameId = null,
    gameTitle = "",
    gameCreatedBy = null,
    allowGiftRedPlay = false,
    playSessionId = null
  } = {}
) {
  if (!userId) return null;
  const pink = Math.max(0, Math.floor(Number(pinkCost) || 0));
  const red = Math.max(0, Math.floor(Number(redCost) || 0));
  if (pink === 0 && red === 0) return null;

  const pool = getPool();
  if (!pool) {
    const u = await userService.findById(userId);
    if (!u) {
      const e = new Error("ไม่พบบัญชี");
      e.code = "AUTH";
      throw e;
    }
    if (u.pinkHeartsBalance < pink || u.redHeartsBalance < red) {
      const e = new Error("หัวใจไม่พอเริ่มรอบ");
      e.code = "INSUFFICIENT_HEARTS";
      throw e;
    }
    const title = gameTitle ? String(gameTitle).trim() : "";
    const sid =
      playSessionId != null && String(playSessionId).trim()
        ? String(playSessionId).trim().slice(0, 64)
        : null;
    return userService.adjustDualHearts(userId, -pink, -red, {
      kind: "game_start",
      label: title ? `เริ่มเล่นเกม「${title}」` : "เริ่มเล่นเกมส่วนกลาง",
      meta: {
        gameMode: "central",
        gameId: gameId || null,
        ...(sid ? { playSessionId: sid } : {}),
        gameTitle: title || null,
        pinkCharged: pink,
        redCharged: red,
        redFromRoomGifts: {},
        redFromGeneral: red
      }
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const uRes = await client.query(
      `SELECT pink_hearts_balance, red_hearts_balance,
              COALESCE(red_giveaway_balance, 0) AS red_giveaway_balance
       FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );
    if (uRes.rows.length === 0) {
      await client.query("ROLLBACK");
      const e = new Error("ไม่พบบัญชี");
      e.code = "AUTH";
      throw e;
    }
    const pinkHave = Math.max(0, Math.floor(Number(uRes.rows[0].pink_hearts_balance) || 0));
    const generalRedHave = Math.max(0, Math.floor(Number(uRes.rows[0].red_hearts_balance) || 0));
    const giveawayHave = Math.max(
      0,
      Math.floor(Number(uRes.rows[0].red_giveaway_balance) || 0)
    );

    if (pinkHave < pink) {
      await client.query("ROLLBACK");
      const e = new Error("หัวใจไม่พอเริ่มรอบ");
      e.code = "INSUFFICIENT_HEARTS";
      throw e;
    }

    const giftRows = await client.query(
      `SELECT creator_id, balance
       FROM user_room_red_balance
       WHERE user_id = $1 AND balance > 0
       FOR UPDATE`,
      [userId]
    );

    const byCreator = new Map();
    for (const row of giftRows.rows) {
      const cid = String(row.creator_id);
      byCreator.set(cid, Math.max(0, Math.floor(Number(row.balance) || 0)));
    }

    let needRed = red;
    const giftDeductions = {};

    function takeFromCreators(allowIds) {
      const ids = Array.from(allowIds).sort();
      for (const cid of ids) {
        if (needRed <= 0) break;
        const have = byCreator.get(cid) || 0;
        if (have <= 0) continue;
        const take = Math.min(needRed, have);
        if (take <= 0) continue;
        needRed -= take;
        byCreator.set(cid, have - take);
        giftDeductions[cid] = (giftDeductions[cid] || 0) + take;
      }
    }

    if (needRed > 0) {
      if (allowGiftRedPlay) {
        takeFromCreators(byCreator.keys());
      } else if (gameCreatedBy) {
        const gc = String(gameCreatedBy).trim();
        if (byCreator.has(gc)) {
          takeFromCreators([gc]);
        }
      }
    }

    const fromGeneral = Math.min(needRed, generalRedHave);
    needRed -= fromGeneral;

    if (needRed > 0) {
      await client.query("ROLLBACK");
      const e = new Error("หัวใจไม่พอเริ่มรอบ");
      e.code = "INSUFFICIENT_HEARTS";
      throw e;
    }

    for (const [cid, newBal] of byCreator.entries()) {
      const deducted = giftDeductions[cid];
      if (!deducted) continue;
      const finalBal = Math.max(0, newBal);
      if (finalBal === 0) {
        await client.query(
          `DELETE FROM user_room_red_balance WHERE user_id = $1 AND creator_id = $2::uuid`,
          [userId, cid]
        );
      } else {
        await client.query(
          `UPDATE user_room_red_balance
           SET balance = $3, updated_at = NOW()
           WHERE user_id = $1 AND creator_id = $2::uuid`,
          [userId, cid, finalBal]
        );
      }
    }

    const newPink = pinkHave - pink;
    const newGeneralRed = generalRedHave - fromGeneral;
    await client.query(
      `UPDATE users SET
        pink_hearts_balance = $2,
        red_hearts_balance = $3,
        hearts_balance = $2::integer + $3::integer + $4::integer
       WHERE id = $1::uuid`,
      [userId, newPink, newGeneralRed, giveawayHave]
    );

    const title = gameTitle ? String(gameTitle).trim() : "";
    const gameCodeLedger = await fetchCentralGameCode(client, gameId);
    const sid =
      playSessionId != null && String(playSessionId).trim()
        ? String(playSessionId).trim().slice(0, 64)
        : null;
    await heartLedgerService.insertWithClient(client, {
      userId,
      pinkDelta: -pink,
      redDelta: -fromGeneral,
      pinkAfter: newPink,
      redAfter: newGeneralRed,
      kind: "game_start",
      label: title ? `เริ่มเล่นเกม「${title}」` : "เริ่มเล่นเกมส่วนกลาง",
      meta: {
        gameMode: "central",
        gameId: gameId || null,
        ...(sid ? { playSessionId: sid } : {}),
        ...(gameCodeLedger ? { gameCode: gameCodeLedger } : {}),
        gameTitle: title || null,
        pinkCharged: pink,
        redCharged: red,
        redFromRoomGifts: giftDeductions,
        redFromGeneral: fromGeneral
      }
    });

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

  return userService.findById(userId);
}

module.exports = {
  deductCentralGameStart
};
