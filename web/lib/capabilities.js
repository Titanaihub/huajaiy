/**
 * สะท้อน permissions.js ฝั่ง API — ใช้ fallback เมื่อ response ยังไม่มี capabilities
 * (หลัง deploy ทุก endpoint จะส่ง capabilities แล้ว)
 */
/** สอดคล้อง permissions.js — member กับ owner ได้สิทธิ์ชุดเดียวกัน */
const STANDARD_MEMBER_CAPABILITIES = [
  "create_central_game",
  "manage_own_central_game",
  "use_hearts",
  "request_prize_withdrawal",
  "resolve_incoming_withdrawal",
  "manage_owned_shop"
];

const CAPABILITIES_BY_ROLE = {
  member: [...STANDARD_MEMBER_CAPABILITIES],
  owner: [...STANDARD_MEMBER_CAPABILITIES],
  admin: ["*"]
};

export function deriveCapabilitiesForRole(role) {
  const r = String(role || "member").toLowerCase().trim();
  if (r === "admin") return ["*"];
  const list = CAPABILITIES_BY_ROLE[r];
  return list ? [...list] : [...CAPABILITIES_BY_ROLE.member];
}

export function hasCapability(caps, capability) {
  if (!Array.isArray(caps)) return false;
  return caps.includes("*") || caps.includes(String(capability || ""));
}
