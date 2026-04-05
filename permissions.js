const { MEMBER, OWNER, ADMIN } = require("./constants/roles");

/**
 * สิทธิ์มาตรฐานระดับ role
 * - เน้น role-based ก่อน (member/owner/admin)
 * - สิทธิ์แบบ owner-of-resource ให้เช็กเพิ่มที่ service ของโดเมนนั้นๆ
 */
/** สมาชิกทุกคน (member/owner) ใช้ชุดสิทธิ์เดียวกัน — แยกเฉพาะ admin */
const STANDARD_MEMBER_CAPABILITIES = [
  "create_central_game",
  "manage_own_central_game",
  "use_hearts",
  "request_prize_withdrawal",
  "resolve_incoming_withdrawal",
  "manage_owned_shop"
];

const CAPABILITIES_BY_ROLE = {
  [MEMBER]: [...STANDARD_MEMBER_CAPABILITIES],
  [OWNER]: [...STANDARD_MEMBER_CAPABILITIES],
  [ADMIN]: ["*"]
};

function normalizeRole(role) {
  const r = String(role || MEMBER).toLowerCase().trim();
  if (r === ADMIN || r === OWNER || r === MEMBER) return r;
  return MEMBER;
}

function listCapabilitiesForRole(role) {
  const r = normalizeRole(role);
  const list = CAPABILITIES_BY_ROLE[r];
  if (list && list.length) return [...list];
  return [...CAPABILITIES_BY_ROLE[MEMBER]];
}

function hasCapability(role, capability) {
  const caps = listCapabilitiesForRole(role);
  return caps.includes("*") || caps.includes(String(capability || ""));
}

module.exports = {
  normalizeRole,
  listCapabilitiesForRole,
  hasCapability
};
