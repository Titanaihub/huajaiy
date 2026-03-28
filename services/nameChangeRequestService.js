const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { getPool } = require("../db/pool");

const DATA_FILE = path.join(__dirname, "..", "data", "name_change_requests.json");

function ensureDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readFileStore() {
  ensureDir();
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeFileStore(rows) {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(rows, null, 2), "utf8");
}

function rowToRequest(row) {
  const ca = row.created_at;
  const ra = row.resolved_at;
  return {
    id: row.id,
    userId: row.user_id,
    requestedFirstName: row.requested_first_name,
    requestedLastName: row.requested_last_name,
    reason: row.reason,
    status: row.status,
    createdAt: ca instanceof Date ? ca.toISOString() : ca,
    resolvedAt: ra ? (ra instanceof Date ? ra.toISOString() : ra) : null,
    resolverNote: row.resolver_note || null
  };
}

async function hasPendingForUser(userId) {
  const pool = getPool();
  if (!pool) {
    return readFileStore().some(
      (r) => r.userId === userId && r.status === "pending"
    );
  }
  const r = await pool.query(
    `SELECT 1 FROM name_change_requests WHERE user_id = $1 AND status = 'pending' LIMIT 1`,
    [userId]
  );
  return r.rows.length > 0;
}

async function createRequest(userId, data) {
  const pool = getPool();
  const id = crypto.randomUUID();
  if (!pool) {
    const rows = readFileStore();
    if (rows.some((x) => x.userId === userId && x.status === "pending")) {
      const err = new Error("PENDING_NAME_CHANGE_EXISTS");
      err.code = "PENDING_NAME_CHANGE_EXISTS";
      throw err;
    }
    const rec = {
      id,
      userId,
      requestedFirstName: data.requestedFirstName,
      requestedLastName: data.requestedLastName,
      reason: data.reason,
      status: "pending",
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      resolverNote: null
    };
    rows.push(rec);
    writeFileStore(rows);
    return rec;
  }
  const pending = await pool.query(
    `SELECT id FROM name_change_requests WHERE user_id = $1 AND status = 'pending' LIMIT 1`,
    [userId]
  );
  if (pending.rows.length > 0) {
    const err = new Error("PENDING_NAME_CHANGE_EXISTS");
    err.code = "PENDING_NAME_CHANGE_EXISTS";
    throw err;
  }
  const r = await pool.query(
    `INSERT INTO name_change_requests (
       id, user_id, requested_first_name, requested_last_name, reason, status
     ) VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING *`,
    [
      id,
      userId,
      data.requestedFirstName,
      data.requestedLastName,
      data.reason
    ]
  );
  return rowToRequest(r.rows[0]);
}

async function listPending() {
  const pool = getPool();
  if (!pool) {
    return readFileStore()
      .filter((x) => x.status === "pending")
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  }
  const r = await pool.query(
    `SELECT * FROM name_change_requests WHERE status = 'pending' ORDER BY created_at ASC`
  );
  return r.rows.map(rowToRequest);
}

async function listForUser(userId) {
  const pool = getPool();
  if (!pool) {
    return readFileStore()
      .filter((x) => x.userId === userId)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }
  const r = await pool.query(
    `SELECT * FROM name_change_requests WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return r.rows.map(rowToRequest);
}

async function findById(id) {
  const pool = getPool();
  if (!pool) {
    return readFileStore().find((x) => x.id === id) || null;
  }
  const r = await pool.query(
    `SELECT * FROM name_change_requests WHERE id = $1`,
    [id]
  );
  if (r.rows.length === 0) return null;
  return rowToRequest(r.rows[0]);
}

async function setStatus(id, status, resolverNote = null) {
  const pool = getPool();
  const now = new Date().toISOString();
  if (!pool) {
    const rows = readFileStore();
    const i = rows.findIndex((x) => x.id === id);
    if (i < 0) return null;
    rows[i] = {
      ...rows[i],
      status,
      resolvedAt: now,
      resolverNote: resolverNote || rows[i].resolverNote
    };
    writeFileStore(rows);
    return rows[i];
  }
  const r = await pool.query(
    `UPDATE name_change_requests
     SET status = $2, resolved_at = NOW(), resolver_note = $3
     WHERE id = $1
     RETURNING *`,
    [id, status, resolverNote]
  );
  if (r.rows.length === 0) return null;
  return rowToRequest(r.rows[0]);
}

module.exports = {
  hasPendingForUser,
  createRequest,
  listPending,
  listForUser,
  findById,
  setStatus
};
