const crypto = require("crypto");
const { getPool } = require("../db/pool");

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeGiftCode() {
  let s = "R";
  for (let i = 0; i < 8; i += 1) {
    s += CODE_CHARS[crypto.randomInt(0, CODE_CHARS.length)];
  }
  return s;
}

/**
 * @param {string} creatorId
 * @param {{ redAmount: number, maxUses?: number, expiresAt?: string | null }} opts
 */
async function createCode(creatorId, opts = {}) {
  const pool = getPool();
  if (!pool) {
    const e = new Error("ระบบรหัสห้องต้องใช้ PostgreSQL");
    e.code = "DB_REQUIRED";
    throw e;
  }
  const redAmount = Math.max(1, Math.floor(Number(opts.redAmount) || 0));
  const maxUses = Math.max(1, Math.floor(Number(opts.maxUses) || 1));
  const expiresAt =
    opts.expiresAt != null && String(opts.expiresAt).trim()
      ? new Date(String(opts.expiresAt).trim())
      : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    const e = new Error("รูปแบบวันหมดอายุไม่ถูกต้อง");
    e.code = "VALIDATION";
    throw e;
  }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = makeGiftCode();
    try {
      const r = await pool.query(
        `INSERT INTO room_red_gift_codes (id, code, creator_id, red_amount, max_uses, uses_count, expires_at)
         VALUES ($1, $2, $3::uuid, $4, $5, 0, $6)
         RETURNING id, code, creator_id AS "creatorId", red_amount AS "redAmount",
           max_uses AS "maxUses", uses_count AS "usesCount", expires_at AS "expiresAt", created_at AS "createdAt"`,
        [
          crypto.randomUUID(),
          code,
          creatorId,
          redAmount,
          maxUses,
          expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt.toISOString() : null
        ]
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
            expires_at AS "expiresAt", created_at AS "createdAt"
     FROM room_red_gift_codes
     WHERE creator_id = $1::uuid
     ORDER BY created_at DESC
     LIMIT 100`,
    [creatorId]
  );
  return r.rows.map((row) => ({
    ...row,
    expired:
      row.expiresAt != null && new Date(row.expiresAt).getTime() < Date.now(),
    exhausted: Number(row.usesCount) >= Number(row.maxUses)
  }));
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
  createCode,
  listCodesForCreator,
  listRoomGiftBalancesForUser,
  redeemCode
};
