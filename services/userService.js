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
      const err = new Error("USERNAME_TAKEN");
      err.code = "USERNAME_TAKEN";
      throw err;
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
  createUser,
  publicUser
};
