const crypto = require("crypto");
const { getPool } = require("../db/pool");
const userStore = require("../userStore");
const { MEMBER } = require("../constants/roles");

function rowToUser(row) {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    role: row.role || MEMBER,
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

async function createUser({ username, passwordHash, firstName, lastName, phone }) {
  const pool = getPool();
  const un = String(username).toLowerCase();
  if (!pool) {
    return userStore.createUser({
      username: un,
      passwordHash,
      firstName,
      lastName,
      phone
    });
  }

  const existingPhone = await findByPhone(phone);
  if (existingPhone) {
    const err = new Error("PHONE_TAKEN");
    err.code = "PHONE_TAKEN";
    throw err;
  }
  const existingName = await findByThaiFullName(firstName, lastName);
  if (existingName) {
    const err = new Error("FULL_NAME_TAKEN");
    err.code = "FULL_NAME_TAKEN";
    throw err;
  }

  const id = crypto.randomUUID();
  try {
    const r = await pool.query(
      `INSERT INTO users (id, username, password_hash, first_name, last_name, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, un, passwordHash, firstName, lastName, phone]
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
  return {
    id: u.id,
    username: u.username,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    role: u.role || MEMBER
  };
}

module.exports = {
  findByUsername,
  findById,
  findByPhone,
  findByThaiFullName,
  createUser,
  publicUser
};
