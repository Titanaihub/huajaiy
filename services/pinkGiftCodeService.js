const crypto = require("crypto");
const { getPool } = require("../db/pool");
const heartLedgerService = require("./heartLedgerService");
const userService = require("./userService");

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makePinkGiftCode() {
  let s = "P";
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

function requirePool() {
  const pool = getPool();
  if (!pool) {
    const e = new Error("DB_REQUIRED");
    e.code = "DB_REQUIRED";
    throw e;
  }
  return pool;
}

/**
 * @param {import("pg").PoolClient} client
 */
async function insertOnePinkCode(client, createdBy, pinkAmount, maxUses, expiresAtIso, note) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const code = makePinkGiftCode();
    const id = crypto.randomUUID();
    try {
      const r = await client.query(
        `INSERT INTO pink_gift_codes (
           id, code, created_by, pink_amount, max_uses, uses_count, expires_at, note
         )
         VALUES ($1, $2, $3::uuid, $4, $5, 0, $6, $7)
         RETURNING id, code, created_by AS "createdBy", pink_amount AS "pinkAmount",
           max_uses AS "maxUses", uses_count AS "usesCount",
           expires_at AS "expiresAt", note, created_at AS "createdAt"`,
        [
          id,
          code,
          createdBy,
          pinkAmount,
          maxUses,
          expiresAtIso,
          note != null && String(note).trim() ? String(note).trim().slice(0, 500) : null
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

/**
 * แอดมินสร้างรหัสแลกหัวใจชมพู — ไม่หักยอดจากบัญชีแอดมิน (ออกจากระบบโปรโมชัน)
 */
async function issuePinkGiftCodes(adminUserId, options = {}) {
  requirePool();
  const pinkAmount = Math.max(1, Math.floor(Number(options.pinkAmount) || 0));
  const codeCount = Math.min(100, Math.max(1, Math.floor(Number(options.codeCount) || 1)));
  let maxUses = Math.max(1, Math.floor(Number(options.maxUses) || 1));
  if (codeCount > 1) {
    maxUses = 1;
  }
  const expiresAtIso =
    options.expiresAt != null && String(options.expiresAt).trim()
      ? parseExpiresInput(options.expiresAt)
      : null;
  const note = options.note != null ? String(options.note) : "";

  const pool = getPool();
  const client = await pool.connect();
  const codes = [];
  try {
    await client.query("BEGIN");
    for (let i = 0; i < codeCount; i += 1) {
      codes.push(
        await insertOnePinkCode(
          client,
          adminUserId,
          pinkAmount,
          maxUses,
          expiresAtIso,
          note
        )
      );
    }
    await client.query("COMMIT");
    return { codes, code: codes[0] || null };
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

async function listPinkGiftCodesAdmin() {
  const pool = requirePool();
  const r = await pool.query(
    `SELECT c.id, c.code, c.created_by AS "createdBy", c.pink_amount AS "pinkAmount",
            c.max_uses AS "maxUses", c.uses_count AS "usesCount",
            c.expires_at AS "expiresAt", c.note, c.canceled_at AS "canceledAt",
            c.created_at AS "createdAt",
            u.username AS "createdByUsername"
     FROM pink_gift_codes c
     LEFT JOIN users u ON u.id = c.created_by
     ORDER BY c.created_at DESC
     LIMIT 500`
  );
  return r.rows.map((row) => ({
    ...row,
    cancelled: Boolean(row.canceledAt),
    expired:
      row.expiresAt != null && new Date(row.expiresAt).getTime() < Date.now(),
    exhausted: Number(row.usesCount) >= Number(row.maxUses)
  }));
}

async function cancelPinkGiftCode(_adminUserId, codeId) {
  const pool = requirePool();
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
      `SELECT * FROM pink_gift_codes WHERE id = $1::uuid FOR UPDATE`,
      [id]
    );
    if (cRes.rows.length === 0) {
      await client.query("ROLLBACK");
      const e = new Error("ไม่พบรหัสนี้");
      e.code = "NOT_FOUND";
      throw e;
    }
    const c = cRes.rows[0];
    if (c.canceled_at) {
      await client.query("ROLLBACK");
      const e = new Error("รหัสนี้ถูกยกเลิกแล้ว");
      e.code = "VALIDATION";
      throw e;
    }
    await client.query(
      `UPDATE pink_gift_codes SET canceled_at = NOW() WHERE id = $1::uuid`,
      [id]
    );
    await client.query("COMMIT");
    return { ok: true, code: c.code };
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
 * สมาชิกแลกรหัส — เพิ่ม pink_hearts_balance
 */
async function redeemPinkCode(redeemerUserId, rawCode) {
  requirePool();
  const code = String(rawCode || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  if (code.length < 4) {
    const e = new Error("กรุณากรอกรหัสให้ถูกต้อง");
    e.code = "VALIDATION";
    throw e;
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const cRes = await client.query(
      `SELECT * FROM pink_gift_codes WHERE code = $1 FOR UPDATE`,
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
    if (String(c.created_by) === String(redeemerUserId)) {
      await client.query("ROLLBACK");
      const e = new Error("ไม่สามารถแลกรหัสที่ตัวเองสร้างได้");
      e.code = "VALIDATION";
      throw e;
    }

    const dup = await client.query(
      `SELECT 1 FROM pink_gift_redemptions WHERE code_id = $1::uuid AND redeemer_id = $2::uuid`,
      [c.id, redeemerUserId]
    );
    if (dup.rows.length > 0) {
      await client.query("ROLLBACK");
      const e = new Error("คุณแลกรหัสนี้แล้ว");
      e.code = "ALREADY_REDEEMED";
      throw e;
    }

    const amt = Math.max(1, Math.floor(Number(c.pink_amount) || 0));

    await client.query(
      `INSERT INTO pink_gift_redemptions (id, code_id, redeemer_id, pink_amount)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4)`,
      [crypto.randomUUID(), c.id, redeemerUserId, amt]
    );

    await client.query(
      `UPDATE pink_gift_codes SET uses_count = uses_count + 1 WHERE id = $1::uuid`,
      [c.id]
    );

    const { pinkAfter, redAfter } = await userService.adjustDualHeartsWithClient(
      client,
      redeemerUserId,
      amt,
      0,
      {
        kind: "pink_gift_code_redeem",
        label: `แลกรหัสหัวใจชมพู · ${code}`,
        meta: {
          codeId: String(c.id),
          code,
          pinkAmount: amt,
          createdBy: String(c.created_by)
        }
      }
    );

    await client.query("COMMIT");

    return {
      ok: true,
      pinkAdded: amt,
      pinkBalanceAfter: pinkAfter,
      redBalanceAfter: redAfter,
      code
    };
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    if (e.code === "23505") {
      const err = new Error("คุณแลกรหัสนี้แล้ว");
      err.code = "ALREADY_REDEEMED";
      throw err;
    }
    throw e;
  } finally {
    client.release();
  }
}

module.exports = {
  issuePinkGiftCodes,
  listPinkGiftCodesAdmin,
  cancelPinkGiftCode,
  redeemPinkCode
};
