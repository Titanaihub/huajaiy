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

function findByUsername(username) {
  const u = String(username || "").toLowerCase();
  return readUsers().find((x) => x.username === u) || null;
}

function findById(id) {
  return readUsers().find((x) => x.id === id) || null;
}

function createUser({ username, passwordHash, firstName, lastName, phone }) {
  const users = readUsers();
  const un = String(username).toLowerCase();
  if (users.some((x) => x.username === un)) {
    const err = new Error("USERNAME_TAKEN");
    err.code = "USERNAME_TAKEN";
    throw err;
  }
  const user = {
    id: crypto.randomUUID(),
    username: un,
    passwordHash,
    firstName,
    lastName,
    phone,
    role: MEMBER,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  writeUsers(users);
  return user;
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
