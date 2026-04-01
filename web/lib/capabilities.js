/**
 * สะท้อน permissions.js ฝั่ง API — ใช้ fallback เมื่อ response ยังไม่มี capabilities
 * (หลัง deploy ทุก endpoint จะส่ง capabilities แล้ว)
 */
const CAPABILITIES_BY_ROLE = {
  member: [
    "create_central_game",
    "manage_own_central_game",
    "use_hearts",
    "request_prize_withdrawal",
    "resolve_incoming_withdrawal"
  ],
  owner: [
    "create_central_game",
    "manage_own_central_game",
    "use_hearts",
    "request_prize_withdrawal",
    "resolve_incoming_withdrawal",
    "manage_owned_shop"
  ],
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
