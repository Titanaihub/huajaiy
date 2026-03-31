const crypto = require("crypto");
const { getPool } = require("../db/pool");
const heartLedgerService = require("./heartLedgerService");

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeGiftCode() {
  let s = "R";
  for (let i = 0; i < 8; i += 1) {
    s += CODE_CHARS[crypto.randomInt(0, CODE_CHARS.length)];
  }
  return s;
}

function parseExpiresInput(v) {
  if (v == null || !String(v).trim()) return null;
  const d = new Date(String(v).trim());
  if (Number.isNaN(d.getTime())) {
    const e = new Error("รูปแบบวันหมดอายุไม่ถูกต้อง");
    e.code = "VALIDATION";
    throw e;
  }
  return d.toISOString();
}

/**
 * @param {import("pg").PoolClient} client
 */
async function insertOneCode(
  client,
  creatorId,
  redAmount,
  maxUses,
  expiresAtIso,
  fundedGiveaway,
  fundedPlayable
) {
  const fg = Math.max(0, Math.floor(Number(fundedGiveaway) || 0));
  const fp = Math.max(0, Math.floor(Number(fundedPlayable) || 0));
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const code = makeGiftCode();
    const id = crypto.randomUUID();
    try {
      const r = await client.query(
        `INSERT INTO room_red_gift_codes (
           id, code, creator_id, red_amount, max_uses, uses_count, expires_at,
           funded_giveaway, funded_playable
         )
         VALUES ($1, $2, $3::uuid, $4, $5, 0, $6, $7, $8)
         RETURNING id, code, creator_id AS "creatorId", red_amount AS "redAmount",
           max_uses AS "maxUses", uses_count AS "usesCount", expires_at AS "expiresAt", created_at AS "createdAt"`,
        [id, code, creatorId, redAmount, maxUses, expiresAtIso, fg, fp]
      );
      return r.rows[0];
    } catch (e) {
      if (e.code === "23505") continue;
      throw e;
    }
  }
  const e = new Error("สร้างรหัสไม่สำเร็จ — ลองใหม่");
  e.code = "VALIDATION";
  throw e;
}

/**
 * สร้างรหัสและหักหัวใจแดงจากเจ้าของทันที
 * ต้นทุนรวม = redAmount × maxUsesPerCode × จำนวนรหัส
 */
async function issueRoomRedGiftCodes(creatorId, options = {}) {
  const pool = getPool();
  if (!pool) {
    const e = new Error("ระบบรหัสห้องต้องใช้ PostgreSQL");
    e.code = "DB_REQUIRED";
    throw e;
  }
  const redAmount = Math.max(1, Math.floor(Number(options.redAmount) || 0));
  const codeCount = Math.min(100, Math.max(1, Math.floor(Number(options.codeCount) || 1)));
  let maxUses = Math.max(1, Math.floor(Number(options.maxUses) || 1));
  if (codeCount > 1) {
    maxUses = 1;
  }
  const expiresAtIso =
    options.expiresAt != null && String(options.expiresAt).trim()
      ? parseExpiresInput(options.expiresAt)
      : null;

  const totalRedCost = redAmount * maxUses * codeCount;

  const client = await pool.connect();
  const codes = [];
  try {
    await client.query("BEGIN");

    const uRes = await client.query(
      `SELECT pink_hearts_balance, red_hearts_balance, COALESCE(red_giveaway_balance, 0) AS red_giveaway_balance
       FROM users WHERE id = $1::uuid FOR UPDATE`,
      [creatorId]
    );
    if (uRes.rows.length === 0) {
      await client.query("ROLLBACK");
      const e = new Error("ไม่พบบัญชี");
      e.code = "NOT_FOUND";
      throw e;
    }
    const curPink = Math.max(
      0,
      Math.floor(Number(uRes.rows[0].pink_hearts_balance) || 0)
    );
    const curRed = Math.max(
      0,
      Math.floor(Number(uRes.rows[0].red_hearts_balance) || 0)
    );
    const curGive = Math.max(
      0,
      Math.floor(Number(uRes.rows[0].red_giveaway_balance) || 0)
    );

    let remGive = curGive;
    let remPlay = curRed;
    const perCodeCost = redAmount * maxUses;

    for (let i = 0; i < codeCount; i += 1) {
      const fromG = Math.min(remGive, perCodeCost);
      const needP = perCodeCost - fromG;
      if (needP > remPlay) {
        await client.query("ROLLBACK");
        const e = new Error("หัวใจแดงไม่พอสร้างรหัส");
        e.code = "INSUFFICIENT_REDS";
        throw e;
      }
      remGive -= fromG;
      remPlay -= needP;
      codes.push(
        await insertOneCode(
          client,
          creatorId,
          redAmount,
          maxUses,
          expiresAtIso,
          fromG,
          needP
        )
      );
    }

    const fromGiveawayTotal = curGive - remGive;
    const fromPlayableTotal = curRed - remPlay;
    const newGive = remGive;
    const newRed = remPlay;
    await client.query(
      `UPDATE users SET
        red_giveaway_balance = $2,
        red_hearts_balance = $3,
        hearts_balance = $4::integer + $3::integer + $2::integer
      WHERE id = $1::uuid`,
      [creatorId, newGive, newRed, curPink]
    );

    await heartLedgerService.insertWithClient(client, {
      userId: creatorId,
      pinkDelta: 0,
      redDelta: -fromPlayableTotal,
      pinkAfter: curPink,
      redAfter: newRed,
      kind: "room_red_code_issue",
      label: `สร้างรหัสแจกแดงห้อง · ${codeCount} รหัส · หักรวม ${totalRedCost} (แจก ${fromGiveawayTotal} · เล่นได้ ${fromPlayableTotal})`,
      meta: {
        codeCount,
        redPerRedemption: redAmount,
        maxUsesPerCode: maxUses,
        codeIds: codes.map((c) => c.id),
        giveawayDeducted: fromGiveawayTotal,
        playableRedDeducted: fromPlayableTotal,
        redGiveawayBalanceAfter: newGive
      }
    });

    await client.query("COMMIT");
    return { codes, code: codes[0] || null, redDeducted: totalRedCost };
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
}

/**
 * เจ้าของลบรหัส — คืนแดงส่วนที่ยังไม่ถูกแลก (เหลือกี่ครั้ง × แดงต่อครั้ง)
 */
async function deleteCodeByCreator(creatorId, codeId) {
  const pool = getPool();
  if (!pool) {
    const e = new Error("DB_REQUIRED");
    e.code = "DB_REQUIRED";
    throw e;
  }
  const id = String(codeId || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    const e = new Error("รูปแบบรหัสอ้างอิงไม่ถูกต้อง");
    e.code = "VALIDATION";
    throw e;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cRes = await client.query(
      `SELECT * FROM room_red_gift_codes WHERE id = $1::uuid FOR UPDATE`,
      [id]
    );
    if (cRes.rows.length === 0) {
      await client.query("ROLLBACK");
      const e = new Error("ไม่พบรหัสนี้");
      e.code = "NOT_FOUND";
      throw e;
    }
    const c = cRes.rows[0];
    if (String(c.creator_id) !== String(creatorId)) {
      await client.query("ROLLBACK");
      const e = new Error("ไม่ใช่รหัสของคุณ");
      e.code = "FORBIDDEN";
      throw e;
    }

    if (c.canceled_at) {
      await client.query("ROLLBACK");
      return { ok: true, refund: 0, deletedCode: c.code };
    }
    const redAmt = Math.max(1, Math.floor(Number(c.red_amount) || 0));
    const maxU = Math.max(1, Math.floor(Number(c.max_uses) || 1));
    const used = Math.max(0, Math.floor(Number(c.uses_count) || 0));
    const remainingUses = Math.max(0, maxU - used);
    const refund = remainingUses * redAmt;
    const fundedG = Math.max(
      0,
      Math.floor(Number(c.funded_giveaway) || 0)
    );
    const fundedP = Math.max(
      0,
      Math.floor(Number(c.funded_playable) || 0)
    );
    const sumFunded = fundedG + fundedP;
    let refundG = 0;
    let refundP = refund;
    if (refund > 0 && sumFunded > 0) {
      refundG = Math.floor((refund * fundedG) / sumFunded);
      refundP = refund - refundG;
    }

    await client.query(
      `UPDATE room_red_gift_codes
       SET canceled_at = NOW(), uses_count = max_uses, expires_at = COALESCE(expires_at, NOW())
       WHERE id = $1::uuid`,
      [id]
    );

    if (refund > 0) {
      const uRes = await client.query(
        `SELECT pink_hearts_balance, red_hearts_balance, COALESCE(red_giveaway_balance, 0) AS red_giveaway_balance
         FROM users WHERE id = $1::uuid FOR UPDATE`,
        [creatorId]
      );
      const curPink = Math.max(
        0,
        Math.floor(Number(uRes.rows[0].pink_hearts_balance) || 0)
      );
      const curRed = Math.max(
        0,
        Math.floor(Number(uRes.rows[0].red_hearts_balance) || 0)
      );
      const curGive = Math.max(
        0,
        Math.floor(Number(uRes.rows[0].red_giveaway_balance) || 0)
      );
      const newRed = curRed + refundP;
      const newGive = curGive + refundG;
      await client.query(
        `UPDATE users SET
          red_hearts_balance = $2,
          red_giveaway_balance = $3,
          hearts_balance = $4::integer + $2::integer + $3::integer
        WHERE id = $1::uuid`,
        [creatorId, newRed, newGive, curPink]
      );
      await heartLedgerService.insertWithClient(client, {
        userId: creatorId,
        pinkDelta: 0,
        redDelta: refundP,
        pinkAfter: curPink,
        redAfter: newRed,
        kind: "room_red_code_refund",
        label: `ลบรหัสแจกแดงห้อง · คืน ${refund} ดวง (แจก ${refundG} · เล่นได้ ${refundP})`,
        meta: {
          deletedCodeId: id,
          code: c.code,
          remainingUses,
          giveawayRefunded: refundG,
          playableRefunded: refundP,
          redGiveawayBalanceAfter: newGive
        }
      });
    }

    await client.query("COMMIT");
    return { ok: true, refund, deletedCode: c.code };
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
}

async function listCodesForCreator(creatorId) {
  const pool = getPool();
  if (!pool) {
    const e = new Error("DB_REQUIRED");
    e.code = "DB_REQUIRED";
    throw e;
  }
  const r = await pool.query(
    `SELECT id, code, creator_id AS "creatorId", red_amount AS "redAmount",
            max_uses AS "maxUses", uses_count AS "usesCount",
            expires_at AS "expiresAt", created_at AS "createdAt",
            canceled_at AS "canceledAt"
     FROM room_red_gift_codes
     WHERE creator_id = $1::uuid
     ORDER BY created_at DESC
     LIMIT 100`,
    [creatorId]
  );
  const redemptions = await pool.query(
    `SELECT rr.code_id AS "codeId", rr.redeemed_at AS "redeemedAt",
            u.username AS "redeemerUsername"
     FROM room_red_gift_redemptions rr
     LEFT JOIN users u ON u.id = rr.redeemer_id
     WHERE rr.creator_id = $1::uuid
     ORDER BY rr.redeemed_at DESC
     LIMIT 500`,
    [creatorId]
  );
  const byCode = new Map();
  for (const row of redemptions.rows) {
    const key = String(row.codeId);
    if (!byCode.has(key)) byCode.set(key, []);
    byCode.get(key).push({
      redeemedAt: row.redeemedAt,
      redeemerUsername: row.redeemerUsername
        ? String(row.redeemerUsername).toLowerCase()
        : null
    });
  }

  return r.rows.map((row) => {
    const history = byCode.get(String(row.id)) || [];
    const uniqueUsers = [...new Set(history.map((h) => h.redeemerUsername).filter(Boolean))];
    return ({
    ...row,
    redemptions: history,
    redeemedByUsernames: uniqueUsers,
    cancelled: Boolean(row.canceledAt),
    expired:
      row.expiresAt != null && new Date(row.expiresAt).getTime() < Date.now(),
    exhausted: Number(row.usesCount) >= Number(row.maxUses)
  })});
}

/**
 * ยอดหัวใจแดงจากรหัสห้องต่อเจ้าของห้อง (สำหรับแสดงใน /me)
 */
async function listRoomGiftBalancesForUser(userId) {
  const pool = getPool();
  if (!pool) return [];
  const r = await pool.query(
    `SELECT b.creator_id AS "creatorId", b.balance,
            u.username AS "creatorUsername"
     FROM user_room_red_balance b
     LEFT JOIN users u ON u.id = b.creator_id
     WHERE b.user_id = $1::uuid AND b.balance > 0
     ORDER BY b.updated_at DESC`,
    [userId]
  );
  return r.rows.map((row) => ({
    creatorId: String(row.creatorId),
    balance: Math.max(0, Math.floor(Number(row.balance) || 0)),
    creatorUsername: row.creatorUsername
      ? String(row.creatorUsername).toLowerCase()
      : null
  }));
}

/**
 * แลกรหัส — เพิ่มยอดใน user_room_red_balance ภายใต้ creator ของรหัส
 */
async function redeemCode(redeemerUserId, rawCode) {
  const pool = getPool();
  if (!pool) {
    const e = new Error("การแลกรหัสต้องใช้ PostgreSQL");
    e.code = "DB_REQUIRED";
    throw e;
  }
  const code = String(rawCode || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  if (code.length < 4) {
    const e = new Error("กรุณากรอกรหัสให้ถูกต้อง");
    e.code = "VALIDATION";
    throw e;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const cRes = await client.query(
      `SELECT * FROM room_red_gift_codes WHERE code = $1 FOR UPDATE`,
      [code]
    );
    if (cRes.rows.length === 0) {
      await client.query("ROLLBACK");
      const e = new Error("ไม่พบรหัสนี้");
      e.code = "NOT_FOUND";
      throw e;
    }
    const c = cRes.rows[0];
    if (c.expires_at && new Date(c.expires_at).getTime() < Date.now()) {
      await client.query("ROLLBACK");
      const e = new Error("รหัสนี้หมดอายุแล้ว");
      e.code = "EXPIRED";
      throw e;
    }
    if (c.canceled_at) {
      await client.query("ROLLBACK");
      const e = new Error("รหัสนี้ถูกยกเลิกแล้ว");
      e.code = "CANCELED";
      throw e;
    }
    if (Number(c.uses_count) >= Number(c.max_uses)) {
      await client.query("ROLLBACK");
      const e = new Error("รหัสนี้ถูกใช้ครบจำนวนแล้ว");
      e.code = "EXHAUSTED";
      throw e;
    }
    if (String(c.creator_id) === String(redeemerUserId)) {
      await client.query("ROLLBACK");
      const e = new Error("ไม่สามารถแลกรหัสของตัวเองได้");
      e.code = "VALIDATION";
      throw e;
    }

    await client.query(
      `UPDATE room_red_gift_codes SET uses_count = uses_count + 1 WHERE id = $1`,
      [c.id]
    );

    const amt = Math.max(1, Math.floor(Number(c.red_amount) || 0));
    await client.query(
      `INSERT INTO user_room_red_balance (user_id, creator_id, balance)
       VALUES ($1::uuid, $2::uuid, $3)
       ON CONFLICT (user_id, creator_id) DO UPDATE SET
         balance = user_room_red_balance.balance + EXCLUDED.balance,
         updated_at = NOW()`,
      [redeemerUserId, c.creator_id, amt]
    );
    await client.query(
      `INSERT INTO room_red_gift_redemptions (id, code_id, creator_id, redeemer_id, red_amount)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5)`,
      [crypto.randomUUID(), c.id, c.creator_id, redeemerUserId, amt]
    );

    await client.query("COMMIT");

    return {
      ok: true,
      redAdded: amt,
      creatorId: String(c.creator_id),
      code: c.code
    };
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
}

module.exports = {
  issueRoomRedGiftCodes,
  deleteCodeByCreator,
  listCodesForCreator,
  listRoomGiftBalancesForUser,
  redeemCode
};
