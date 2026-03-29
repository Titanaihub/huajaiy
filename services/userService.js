const crypto = require("crypto");
const { getPool } = require("../db/pool");
const userStore = require("../userStore");
const { MEMBER, ADMIN } = require("../constants/roles");
const heartLedgerService = require("./heartLedgerService");

function normalizeBirthDate(v) {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s || null;
}

function rowToUser(row) {
  const pink =
    row.pink_hearts_balance == null
      ? Math.max(0, Math.floor(Number(row.hearts_balance) || 0))
      : Math.max(0, Math.floor(Number(row.pink_hearts_balance) || 0));
  const red =
    row.red_hearts_balance == null
      ? 0
      : Math.max(0, Math.floor(Number(row.red_hearts_balance) || 0));
  const sum = pink + red;
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    countryCode: row.country_code || "TH",
    registrationIp: row.registration_ip || null,
    gender: row.gender || null,
    birthDate: normalizeBirthDate(row.birth_date),
    shippingAddress: row.shipping_address || null,
    role: row.role || MEMBER,
    pinkHeartsBalance: pink,
    redHeartsBalance: red,
    heartsBalance: sum,
    createdAt: row.created_at
  };
}

async function findByUsername(username) {
  const pool = getPool();
  const un = String(username || "").toLowerCase();
  if (!pool) {
    return userStore.findByUsername(un);
  }
  const r = await pool.query("SELECT * FROM users WHERE username = $1", [un]);
  if (r.rows.length === 0) return null;
  return rowToUser(r.rows[0]);
}

async function findById(id) {
  const pool = getPool();
  if (!pool) {
    return userStore.findById(id);
  }
  const r = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  if (r.rows.length === 0) return null;
  return rowToUser(r.rows[0]);
}

async function findByPhone(phone) {
  const p = String(phone ?? "").trim();
  if (!p) return null;
  const pool = getPool();
  if (!pool) {
    return userStore.findByPhone(p);
  }
  const r = await pool.query("SELECT * FROM users WHERE phone = $1 LIMIT 1", [
    p
  ]);
  if (r.rows.length === 0) return null;
  return rowToUser(r.rows[0]);
}

/** หาผู้ใช้ที่ชื่อและนามสกุลตรงกันทั้งคู่เท่านั้น (ไม่ถือว่าซ้ำถ้าตรงแค่อย่างใดอย่างหนึ่ง) */
async function findByThaiFullName(firstName, lastName) {
  const fn = String(firstName ?? "").trim();
  const ln = String(lastName ?? "").trim();
  if (!fn || !ln) return null;
  const pool = getPool();
  if (!pool) {
    return userStore.findByThaiFullName(fn, ln);
  }
  const r = await pool.query(
    "SELECT * FROM users WHERE first_name = $1 AND last_name = $2 LIMIT 1",
    [fn, ln]
  );
  if (r.rows.length === 0) return null;
  return rowToUser(r.rows[0]);
}

async function createUser({
  username,
  passwordHash,
  firstName,
  lastName,
  phone,
  countryCode = "TH",
  registrationIp = null,
  role = MEMBER
}) {
  const pool = getPool();
  const un = String(username).toLowerCase();
  const cc = String(countryCode || "TH").toUpperCase().slice(0, 8);
  const ip =
    registrationIp == null
      ? null
      : String(registrationIp).slice(0, 64);
  const rle = role || MEMBER;
  if (!pool) {
    return userStore.createUser({
      username: un,
      passwordHash,
      firstName,
      lastName,
      phone,
      countryCode: cc,
      registrationIp: ip,
      role: rle
    });
  }

  const existingPhone = await findByPhone(phone);
  if (existingPhone) {
    const err = new Error("PHONE_TAKEN");
    err.code = "PHONE_TAKEN";
    throw err;
  }

  const id = crypto.randomUUID();
  try {
    const r = await pool.query(
      `INSERT INTO users (id, username, password_hash, first_name, last_name, phone, country_code, registration_ip, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, un, passwordHash, firstName, lastName, phone, cc, ip, rle]
    );
    return rowToUser(r.rows[0]);
  } catch (e) {
    if (e.code === "23505") {
      const d = String(e.detail || "").toLowerCase();
      if (d.includes("(phone)")) {
        const pe = new Error("PHONE_TAKEN");
        pe.code = "PHONE_TAKEN";
        throw pe;
      }
      const ue = new Error("USERNAME_TAKEN");
      ue.code = "USERNAME_TAKEN";
      throw ue;
    }
    throw e;
  }
}

function publicUser(u) {
  if (!u) return null;
  const p =
    u.pinkHeartsBalance == null
      ? Math.max(0, Math.floor(Number(u.heartsBalance) || 0))
      : Math.max(0, Math.floor(Number(u.pinkHeartsBalance) || 0));
  const r =
    u.redHeartsBalance == null
      ? 0
      : Math.max(0, Math.floor(Number(u.redHeartsBalance) || 0));
  return {
    id: u.id,
    username: u.username,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    countryCode: u.countryCode || "TH",
    gender: u.gender ?? null,
    birthDate: u.birthDate ?? null,
    shippingAddress: u.shippingAddress ?? null,
    role: u.role || MEMBER,
    pinkHeartsBalance: p,
    redHeartsBalance: r,
    heartsBalance: p + r
  };
}

async function updateProfile(userId, { gender, birthDate, shippingAddress }) {
  const pool = getPool();
  if (!pool) {
    userStore.updateUser(userId, { gender, birthDate, shippingAddress });
    return findById(userId);
  }
  await pool.query(
    `UPDATE users SET gender = $2, birth_date = $3, shipping_address = $4 WHERE id = $1`,
    [userId, gender, birthDate || null, shippingAddress]
  );
  return findById(userId);
}

async function setPasswordAndRole(userId, passwordHash, role = ADMIN) {
  const pool = getPool();
  if (!pool) {
    userStore.updateUser(userId, { passwordHash, role });
    return findById(userId);
  }
  await pool.query(
    `UPDATE users SET password_hash = $2, role = $3 WHERE id = $1`,
    [userId, passwordHash, role]
  );
  return findById(userId);
}

async function setPasswordHashOnly(userId, passwordHash) {
  const pool = getPool();
  if (!pool) {
    userStore.updateUser(userId, { passwordHash });
    return findById(userId);
  }
  await pool.query(
    `UPDATE users SET password_hash = $2 WHERE id = $1`,
    [userId, passwordHash]
  );
  return findById(userId);
}

/**
 * บวก/ลบหัวใจชมพู+แดง (ยอดแต่ละประเภทไม่ต่ำกว่า 0)
 * @param {{ kind?: string; label?: string; meta?: Record<string, unknown> } | null} ledgerOpts — บันทึก heart_ledger เมื่อมี DB
 */
async function adjustDualHearts(userId, pinkDelta = 0, redDelta = 0, ledgerOpts = null) {
  const pd = Math.floor(Number(pinkDelta) || 0);
  const rd = Math.floor(Number(redDelta) || 0);
  if (pd === 0 && rd === 0) return findById(userId);
  const pool = getPool();
  if (!pool) {
    const u = userStore.findById(userId);
    if (!u) return null;
    const p = Math.max(
      0,
      Math.floor(Number(u.pinkHeartsBalance ?? u.heartsBalance) || 0) + pd
    );
    const r = Math.max(0, Math.floor(Number(u.redHeartsBalance) || 0) + rd);
    userStore.updateUser(userId, {
      pinkHeartsBalance: p,
      redHeartsBalance: r,
      heartsBalance: p + r
    });
    return findById(userId);
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const upd = await client.query(
      `UPDATE users SET
        pink_hearts_balance = GREATEST(0, COALESCE(pink_hearts_balance, 0) + $2),
        red_hearts_balance = GREATEST(0, COALESCE(red_hearts_balance, 0) + $3),
        hearts_balance =
          GREATEST(0, COALESCE(pink_hearts_balance, 0) + $2) +
          GREATEST(0, COALESCE(red_hearts_balance, 0) + $3)
      WHERE id = $1
      RETURNING pink_hearts_balance, red_hearts_balance`,
      [userId, pd, rd]
    );
    if (upd.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }
    const bal = upd.rows[0];
    const pAfter = Math.max(0, Math.floor(Number(bal.pink_hearts_balance) || 0));
    const rAfter = Math.max(0, Math.floor(Number(bal.red_hearts_balance) || 0));
    const kind = ledgerOpts?.kind || "adjustment";
    const label =
      ledgerOpts?.label ||
      (pd < 0 || rd < 0 ? "หัก / ปรับลดหัวใจ" : "ได้รับ / เพิ่มหัวใจ");
    await heartLedgerService.insertWithClient(client, {
      userId,
      pinkDelta: pd,
      redDelta: rd,
      pinkAfter: pAfter,
      redAfter: rAfter,
      kind,
      label,
      meta: ledgerOpts?.meta ?? null
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
  return findById(userId);
}

/** ความเข้ากันได้เดิม: ปรับเฉพาะหัวใจชมพู */
async function adjustHeartsBalance(userId, delta) {
  return adjustDualHearts(userId, delta, 0);
}

async function updateOfficialNames(userId, firstName, lastName) {
  const pool = getPool();
  if (!pool) {
    userStore.updateUser(userId, { firstName, lastName });
    return findById(userId);
  }
  await pool.query(
    `UPDATE users SET first_name = $2, last_name = $3 WHERE id = $1`,
    [userId, firstName, lastName]
  );
  return findById(userId);
}

function createdAtIso(u) {
  if (!u || u.createdAt == null) return null;
  const ca = u.createdAt;
  return ca instanceof Date ? ca.toISOString() : String(ca);
}

/** รายการสมาชิกในหลังบ้านแอดมิน (ไม่มีรหัสผ่าน) */
function adminMemberListItem(u) {
  if (!u) return null;
  const p = Math.max(0, Math.floor(Number(u.pinkHeartsBalance) || 0));
  const r = Math.max(0, Math.floor(Number(u.redHeartsBalance) || 0));
  return {
    id: u.id,
    username: u.username,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    countryCode: u.countryCode || "TH",
    role: u.role || MEMBER,
    gender: u.gender ?? null,
    birthDate: u.birthDate ?? null,
    pinkHeartsBalance: p,
    redHeartsBalance: r,
    heartsBalance: p + r,
    createdAt: createdAtIso(u)
  };
}

/** รายละเอียดเต็มสำหรับแอดมิน */
function adminMemberDetail(u) {
  if (!u) return null;
  return {
    ...adminMemberListItem(u),
    shippingAddress: u.shippingAddress ?? null,
    registrationIp: u.registrationIp ?? null,
    passwordNote:
      "รหัสผ่านเก็บเป็นแฮชเท่านั้น — ไม่มีใครดูข้อความจริงได้ ใช้ปุ่มตั้งรหัสใหม่ด้านล่าง"
  };
}

async function listMembers({ q = "", limit = 50, offset = 0 } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const off = Math.max(Number(offset) || 0, 0);
  const pool = getPool();
  if (!pool) {
    const rows = userStore.listForAdmin({ q, limit: lim, offset: off });
    const total = userStore.countForAdmin({ q });
    return {
      users: rows.map(adminMemberListItem),
      total,
      limit: lim,
      offset: off
    };
  }
  const qt = String(q || "").trim();
  if (qt) {
    const pattern = `%${qt}%`;
    const countR = await pool.query(
      `SELECT COUNT(*)::int AS c FROM users
       WHERE username ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1
          OR phone ILIKE $1 OR CAST(id AS TEXT) ILIKE $1`,
      [pattern]
    );
    const total = countR.rows[0].c;
    const r = await pool.query(
      `SELECT * FROM users
       WHERE username ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1
          OR phone ILIKE $1 OR CAST(id AS TEXT) ILIKE $1
       ORDER BY created_at DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      [pattern, lim, off]
    );
    return {
      users: r.rows.map((row) => adminMemberListItem(rowToUser(row))),
      total,
      limit: lim,
      offset: off
    };
  }
  const countR = await pool.query(`SELECT COUNT(*)::int AS c FROM users`);
  const total = countR.rows[0].c;
  const r = await pool.query(
    `SELECT * FROM users ORDER BY created_at DESC NULLS LAST LIMIT $1 OFFSET $2`,
    [lim, off]
  );
  return {
    users: r.rows.map((row) => adminMemberListItem(rowToUser(row))),
    total,
    limit: lim,
    offset: off
  };
}

module.exports = {
  findByUsername,
  findById,
  findByPhone,
  findByThaiFullName,
  createUser,
  setPasswordAndRole,
  setPasswordHashOnly,
  adjustHeartsBalance,
  adjustDualHearts,
  updateProfile,
  updateOfficialNames,
  publicUser,
  adminMemberListItem,
  adminMemberDetail,
  listMembers
};
