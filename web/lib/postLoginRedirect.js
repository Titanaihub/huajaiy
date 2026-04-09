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

/**
 * ลิงก์เข้า LINE (`auto=1`) พร้อม `next=` หน้าปัจจุบันเมื่อ allowlist อนุญาต
 * @param {string} pathname - จาก usePathname()
 * @param {string} search - จาก useSearchParams().toString() (ไม่มี ? นำหน้า)
 */
export function lineLoginWithReturnHref(pathname, search) {
  const path = String(pathname || "/") || "/";
  const q = search && String(search).trim();
  const full = q ? `${path}?${q}` : path;
  const next = sanitizePostLoginNext(full);
  const base = "/login/line?auto=1";
  if (!next) return base;
  return `${base}&next=${encodeURIComponent(next)}`;
}
