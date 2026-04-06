/**
 * เมื่อเปิด NEXT_PUBLIC_HUAJAIY_STRICT_ROUTES=1 — อนุญาตเฉพาะ path ที่ใช้งานจริง + callback OAuth + static ที่จำเป็น
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const USERNAME_RE = /^[a-z0-9_]{3,32}$/;

/** ไม่ถือเป็นหน้าโปรไฟล์สาธารณะ (ชนกับ route ระบบ) */
const RESERVED_TOP = new Set([
  "game",
  "login",
  "admin",
  "member",
  "account",
  "page",
  "api",
  "u",
  "owner",
  "cart",
  "orders",
  "register",
  "auth",
  "contact",
  "privacy",
  "terms",
  "data-deletion",
  "shop",
  "hui",
  "theme-lab",
  "tailwind",
  "organic-template",
  "tailadmin-template",
  "dashui-template",
  "purdue-template",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "manifest.webmanifest"
]);

const ADMIN_FIRST = new Set([
  "profile",
  "prizes",
  "hearts",
  "game",
  "shops",
  "orders",
  "prize-withdraw",
  "hearts-top-up",
  "give-hearts",
  /** แดชบอร์ด Next */
  "panel",
  /** เมนูแอดมินใน TailAdmin / Vue */
  "theme",
  "all-shops",
  "game-settings",
  "central-games",
  "prize-payouts",
  "heart-packs",
  "slip-approvals",
  "name-changes"
]);

const MEMBER_FIRST = new Set([
  "pink-history",
  "hearts",
  "hearts-top-up",
  "profile",
  "prizes",
  "game",
  "game-studio",
  "create-game",
  "shops",
  "orders",
  "prize-withdraw",
  "give-hearts"
]);

const STATIC_PREFIXES = [
  "/organic-template",
  "/tailadmin-template",
  "/dashui-template",
  "/purdue-template"
];

function stripTrailingSlash(p) {
  if (p.length > 1 && p.endsWith("/")) return p.replace(/\/+$/, "");
  return p;
}

/**
 * @param {string} pathname
 * @returns {boolean}
 */
export function isPathAllowed(pathname) {
  const p = stripTrailingSlash(pathname || "/") || "/";

  if (p.startsWith("/_next")) return true;
  if (p.startsWith("/.well-known")) return true;

  for (const pre of STATIC_PREFIXES) {
    if (p === pre || p.startsWith(`${pre}/`)) return true;
  }

  if (/\.(svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json|webmanifest)$/i.test(p)) {
    return true;
  }

  if (p === "/") return true;

  if (p === "/page" || p.startsWith("/page/")) return true;

  if (p === "/game") return true;
  if (p.startsWith("/game/")) {
    const id = p.slice("/game/".length).split("/").filter(Boolean)[0];
    return Boolean(id && UUID_RE.test(id));
  }

  if (p === "/login" || p.startsWith("/login/")) return true;

  /** ลิงก์จาก footer หน้า login / ข้อกำหนดทั่วไป */
  if (
    p === "/privacy" ||
    p === "/terms" ||
    p === "/data-deletion" ||
    p === "/contact"
  ) {
    return true;
  }

  if (p === "/auth/line/callback" || p.startsWith("/auth/line/callback/")) {
    return true;
  }

  if (p === "/admin") return true;
  if (p.startsWith("/admin/")) {
    const parts = p.slice("/admin/".length).split("/").filter(Boolean);
    if (parts.length === 0) return false;
    if (parts[0] === "embed" && parts[1] === "panel") return true;
    return Boolean(parts[0] && ADMIN_FIRST.has(parts[0]));
  }

  if (p === "/member") return true;
  if (p.startsWith("/member/")) {
    const parts = p.slice("/member/".length).split("/").filter(Boolean);
    if (parts.length === 0) return true;
    const first = parts[0];
    if (!MEMBER_FIRST.has(first)) return false;
    if (first === "shops" && parts.length >= 2 && !UUID_RE.test(parts[1])) {
      return false;
    }
    return true;
  }

  if (
    p === "/account/heart-history/giveaway" ||
    p.startsWith("/account/heart-history/giveaway/")
  ) {
    return true;
  }
  const shopProducts = p.match(/^\/account\/shops\/([^/]+)\/products\/?$/);
  if (shopProducts && UUID_RE.test(shopProducts[1])) return true;

  const segments = p.split("/").filter(Boolean);
  if (segments.length === 1) {
    const seg = decodeURIComponent(segments[0]).toLowerCase();
    if (RESERVED_TOP.has(seg)) return false;
    return USERNAME_RE.test(seg);
  }
  if (segments.length === 3 && segments[1] === "post") {
    const seg = decodeURIComponent(segments[0]).toLowerCase();
    if (RESERVED_TOP.has(seg)) return false;
    return USERNAME_RE.test(seg) && UUID_RE.test(segments[2]);
  }

  return false;
}
