const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { MEMBER } = require("./constants/roles");

const DATA_FILE = path.join(__dirname, "data", "users.json");

function ensureDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readUsers() {
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

function writeUsers(users) {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), "utf8");
}

function updateUser(id, patch) {
  const users = readUsers();
  const i = users.findIndex((x) => x.id === id);
  if (i < 0) return null;
  users[i] = { ...users[i], ...patch };
  writeUsers(users);
  return users[i];
}

function normalizeHearts(u) {
  if (!u) return u;
  let p = u.pinkHeartsBalance;
  let r = u.redHeartsBalance;
  if (p == null && r == null) {
    const legacy = Math.max(0, Math.floor(Number(u.heartsBalance) || 0));
    p = legacy;
    r = 0;
  }
  p = Math.max(0, Math.floor(Number(p) || 0));
  r = Math.max(0, Math.floor(Number(r) || 0));
  return { ...u, pinkHeartsBalance: p, redHeartsBalance: r, heartsBalance: p + r };
}

function findByUsername(username) {
  const u = String(username || "").toLowerCase();
  const x = readUsers().find((row) => row.username === u) || null;
  if (!x) return null;
  return normalizeHearts(x);
}

function findById(id) {
  const u = readUsers().find((x) => x.id === id) || null;
  if (!u) return null;
  return normalizeHearts(u);
}

function findByPhone(phone) {
  const p = String(phone || "").trim();
  const u = readUsers().find((x) => x.phone === p) || null;
  return u ? normalizeHearts(u) : null;
}

/** ชื่อกับนามสกุลต้องตรงคู่กันทั้งสองช่องจึงถือว่าเป็นคนเดียวกัน */
function findByThaiFullName(firstName, lastName) {
  const fn = String(firstName || "").trim();
  const ln = String(lastName || "").trim();
  const u = readUsers().find((x) => x.firstName === fn && x.lastName === ln) || null;
  return u ? normalizeHearts(u) : null;
}

function createUser({
  username,
  passwordHash,
  firstName,
  lastName,
  phone,
  countryCode = "TH",
  registrationIp = null,
  role = MEMBER
}) {
  const users = readUsers();
  const un = String(username).toLowerCase();
  if (users.some((x) => x.username === un)) {
    const err = new Error("USERNAME_TAKEN");
    err.code = "USERNAME_TAKEN";
    throw err;
  }
  const p = String(phone || "").trim();
  if (users.some((x) => x.phone === p)) {
    const err = new Error("PHONE_TAKEN");
    err.code = "PHONE_TAKEN";
    throw err;
  }
  const user = {
    id: crypto.randomUUID(),
    username: un,
    passwordHash,
    firstName,
    lastName,
    phone,
    countryCode: String(countryCode || "TH").toUpperCase().slice(0, 8),
    registrationIp:
      registrationIp == null ? null : String(registrationIp).slice(0, 64),
    role: role || MEMBER,
    pinkHeartsBalance: 0,
    redHeartsBalance: 0,
    heartsBalance: 0,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  writeUsers(users);
  return user;
}

function publicUser(u) {
  if (!u) return null;
  const n = normalizeHearts(u);
  return {
    id: n.id,
    username: n.username,
    firstName: n.firstName,
    lastName: n.lastName,
    phone: n.phone,
    countryCode: n.countryCode || "TH",
    gender: n.gender ?? null,
    birthDate: n.birthDate ?? null,
    shippingAddress: n.shippingAddress ?? null,
    role: n.role || MEMBER,
    pinkHeartsBalance: n.pinkHeartsBalance,
    redHeartsBalance: n.redHeartsBalance,
    heartsBalance: n.heartsBalance
  };
}

function rowHaystack(u) {
  return [u.username, u.firstName, u.lastName, String(u.phone || ""), u.id]
    .join(" ")
    .toLowerCase();
}

function filterUsersByQuery(users, q) {
  const qt = String(q || "").trim().toLowerCase();
  if (!qt) return users;
  return users.filter((u) => rowHaystack(u).includes(qt));
}

/** รายการสำหรับแอดมิน — เรียงใหม่ก่อน */
function listForAdmin({ q = "", limit = 50, offset = 0 } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const off = Math.max(Number(offset) || 0, 0);
  let users = readUsers();
  users = filterUsersByQuery(users, q);
  users.sort((a, b) =>
    String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
  );
  return users.slice(off, off + lim).map((row) => normalizeHearts(row));
}

function countForAdmin({ q = "" } = {}) {
  return filterUsersByQuery(readUsers(), q).length;
}

module.exports = {
  findByUsername,
  findById,
  findByPhone,
  findByThaiFullName,
  createUser,
  updateUser,
  publicUser,
  listForAdmin,
  countForAdmin
};
