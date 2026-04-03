/** ระบบสมาชิกหลัก (iframe TailAdmin) — หลังล็อกอิน LINE */
export const MEMBER_WORKSPACE_PATH = "/member";

/** แผงแอดมิน React เดิม — หลังล็อกอินแอดมิน / ลิงก์ «แอดมิน» ในเมนูเว็บหลัก */
export const ADMIN_HOME_PATH = "/admin/panel";

/** แดชบอร์ดร้านค้าในเทมเพลต TailAdmin (Vue path `/` = Ecommerce) */
export const TAILADMIN_SHOP_DASHBOARD_START = "/";

/** หน้าโปรไฟล์ใน iframe */
export const TAILADMIN_PROFILE_START = "/profile";

/** เส้นทางสมาชิกใน iframe (Vue router) — หนึ่งเมนูหนึ่ง path */
export const TAILADMIN_MY_PRIZES_START = "/my-prizes";
export const TAILADMIN_MY_HEARTS_START = "/my-hearts";
export const TAILADMIN_MY_GAMES_START = "/my-games";
export const TAILADMIN_MY_SHOPS_START = "/my-shops";
export const TAILADMIN_MY_ORDERS_START = "/my-orders";
export const TAILADMIN_PRIZE_WITHDRAW_START = "/prize-withdraw-request";
export const TAILADMIN_HEARTS_TOP_UP_START = "/hearts-top-up";
export const TAILADMIN_GIVE_HEARTS_START = "/give-hearts";

/**
 * slug ใน URL สาธารณะ (เช่น /member/shops, /member/game) → path ใน Vue iframe
 * @type {Readonly<Record<string, string>>}
 */
export const MEMBER_SLUG_TO_TAIL = Object.freeze({
  profile: TAILADMIN_PROFILE_START,
  prizes: TAILADMIN_MY_PRIZES_START,
  hearts: TAILADMIN_MY_HEARTS_START,
  game: TAILADMIN_MY_GAMES_START,
  shops: TAILADMIN_MY_SHOPS_START,
  orders: TAILADMIN_MY_ORDERS_START,
  "prize-withdraw": TAILADMIN_PRIZE_WITHDRAW_START,
  "hearts-top-up": TAILADMIN_HEARTS_TOP_UP_START,
  "give-hearts": TAILADMIN_GIVE_HEARTS_START
});

/** tail (Vue) → slug สำหรับ URL /member/{slug} — ยกเว้นแดชบอร์ด = "" */
export const MEMBER_TAIL_TO_SLUG = Object.freeze(
  Object.fromEntries([
    [TAILADMIN_SHOP_DASHBOARD_START, ""],
    ...Object.entries(MEMBER_SLUG_TO_TAIL).map(([slug, tail]) => [tail, slug])
  ])
);

export function normalizeMemberTailPath(tailPath) {
  if (tailPath == null || String(tailPath).trim() === "") return "/";
  let s = String(tailPath).trim().split("?")[0].slice(0, 200);
  if (!s.startsWith("/")) s = `/${s}`;
  if (s.length > 1) s = s.replace(/\/$/, "");
  return s || "/";
}

/** `/member` หรือ `/member/shops` */
export function memberAppPathFromSlug(slug) {
  if (slug == null) return MEMBER_WORKSPACE_PATH;
  const raw = String(slug).trim().toLowerCase();
  if (raw === "") return MEMBER_WORKSPACE_PATH;
  const first = raw.split("/").filter(Boolean)[0];
  if (!first || !(first in MEMBER_SLUG_TO_TAIL)) return MEMBER_WORKSPACE_PATH;
  return `${MEMBER_WORKSPACE_PATH}/${first}`;
}

/** จาก path ใน Vue → URL สมาชิกที่อ่านง่าย (ไม่รู้จัก → /member) */
export function memberAppPathForTail(tailPath) {
  const t = normalizeMemberTailPath(tailPath);
  const slug = MEMBER_TAIL_TO_SLUG[t];
  if (slug === undefined) return MEMBER_WORKSPACE_PATH;
  return slug === "" ? MEMBER_WORKSPACE_PATH : `${MEMBER_WORKSPACE_PATH}/${slug}`;
}

/** slug เดียวจาก URL → tail สำหรับ iframe; ไม่รู้จัก → null */
export function memberTailPathFromSlug(slug) {
  if (slug == null || String(slug).trim() === "") {
    return TAILADMIN_SHOP_DASHBOARD_START;
  }
  const first = String(slug)
    .trim()
    .toLowerCase()
    .split("/")
    .filter(Boolean)[0];
  if (!first) return TAILADMIN_SHOP_DASHBOARD_START;
  return MEMBER_SLUG_TO_TAIL[first] ?? null;
}

/**
 * แยก segment เดียวหลัง `/member` (`/member` → [] , `/member/shops` → ['shops'])
 * @returns {{ segments: string[] } | null} null = ไม่ใช่เส้นทางใต้ /member
 */
export function parseMemberAppPath(pathname) {
  const p = (pathname || "").split("?")[0].replace(/\/$/, "") || "/";
  if (p === "/member") return { segments: [] };
  if (!p.startsWith("/member/")) return null;
  const rest = p.slice("/member/".length);
  const segments = rest.split("/").filter(Boolean).map((s) => s.trim().toLowerCase());
  return { segments };
}

/**
 * URL หน้าเชลล์สมาชิก/แอดมิน
 * - สมาชิก: path สวย `/member/shops` (ไม่ใช้ query)
 * - แอดมิน: ยังใช้ `/admin?huajaiy_start=…` ให้สอดคล้องแผงเดิม
 * @param {string} tailPath เช่น "/" หรือ "/profile"
 * @param {"admin"|"member"|"owner"|string} [role]
 */
export function workspaceShellUrl(tailPath, role) {
  const path = normalizeMemberTailPath(tailPath);
  if (role === "admin") {
    const q = `huajaiy_start=${encodeURIComponent(path)}`;
    return `/admin?${q}`;
  }
  return memberAppPathForTail(path);
}
