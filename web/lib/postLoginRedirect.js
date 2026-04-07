import { isPathAllowed } from "./routeAllowlist";

/** ไม่ให้วนกลับไปหน้าเข้าสู่ระบบหลังล็อกอินสำเร็จ */
function isBlockedPostLoginPath(pathOnly) {
  const p = String(pathOnly || "/").split("?")[0].replace(/\/+$/, "") || "/";
  if (p === "/login" || p.startsWith("/login/")) return true;
  if (p === "/register" || p.startsWith("/register/")) return true;
  if (p === "/auth" || p.startsWith("/auth/")) return true;
  return false;
}

/**
 * ค่า query `next` หลังล็อกอิน — ต้องเป็น path ภายในเว็บที่ allowlist อนุญาต
 * @param {string | null | undefined} nextParam
 * @returns {string | null}
 */
export function sanitizePostLoginNext(nextParam) {
  if (nextParam == null) return null;
  const raw = String(nextParam).trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (raw.length > 2048) return null;
  const pathOnly = raw.split("#")[0].split("?")[0];
  if (isBlockedPostLoginPath(pathOnly)) return null;
  if (!isPathAllowed(pathOnly)) return null;
  return raw.split("#")[0];
}
