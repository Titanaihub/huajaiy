/** ระบบสมาชิกหลัก (iframe TailAdmin) — หลังล็อกอิน · URL นี้ = เมนู «ภาพรวมบัญชี» (Vue /) */
export const MEMBER_WORKSPACE_PATH = "/member";

/** เชลล์แอดมิน — HuajaiyCentralTemplate + แผง React */
export const ADMIN_WORKSPACE_PATH = "/admin";

/** หลังล็อกอินแอดมิน — `/admin` (แผง React โดยตรง) */
export const ADMIN_HOME_PATH = "/admin";

/** แผง React เต็มหน้าจอ (ลิงก์ตรง / บุ๊กมาร์กเก่า) */
export const ADMIN_LEGACY_PANEL_PATH = "/admin/embed/panel";

/**
 * path ใต้ `/admin/{slug}` สำหรับแผง React (AdminDashboard) — slug ไม่ทับ MEMBER_SLUG_TO_TAIL
 * (เช่น ใช้ all-shops แทน shops เพราะ /admin/shops ไป Vue ร้านของฉัน)
 */
export const ADMIN_DASH_SLUG_TO_TAB = Object.freeze({
  members: "members",
  theme: "siteTheme",
  "web-pages": "siteCms",
  "all-shops": "shops",
  "game-settings": "game",
  "central-games": "centralGame",
  "prize-payouts": "prizePayouts",
  "heart-packs": "heartPackages",
  "pink-gift-codes": "pinkGiftCodes",
  "slip-approvals": "heartPurchases",
  "name-changes": "nameChanges"
});

/** @param {string | null | undefined} slug */
export function adminDashTabFromSlug(slug) {
  if (slug == null) return null;
  const s = String(slug).trim().toLowerCase();
  return ADMIN_DASH_SLUG_TO_TAB[s] ?? null;
}

/** @param {string} tabKey คีย์แท็บ AdminDashboard */
export function adminShellPathForTab(tabKey) {
  const slug = Object.keys(ADMIN_DASH_SLUG_TO_TAB).find(
    (k) => ADMIN_DASH_SLUG_TO_TAB[k] === tabKey
  );
  if (!slug) return ADMIN_WORKSPACE_PATH;
  return `${ADMIN_WORKSPACE_PATH}/${slug}`;
}

/** slug ใต้ `/admin/{slug}` สำหรับแท็บ AdminDashboard */
export function isAdminDashboardShellSlug(slug) {
  if (slug == null) return false;
  return String(slug).trim().toLowerCase() in ADMIN_DASH_SLUG_TO_TAB;
}

const ADMIN_DASH_TAB_VALUES = new Set(Object.values(ADMIN_DASH_SLUG_TO_TAB));

/** @param {string | null | undefined} tabKey */
export function isValidAdminDashboardTabKey(tabKey) {
  return tabKey != null && ADMIN_DASH_TAB_VALUES.has(String(tabKey));
}

/** แดชบอร์ดร้านค้าในเทมเพลต TailAdmin (Vue path `/` = Ecommerce) */
export const TAILADMIN_SHOP_DASHBOARD_START = "/";

/** หน้าโปรไฟล์ใน iframe */
export const TAILADMIN_PROFILE_START = "/profile";

/** เส้นทางสมาชิกใน iframe (Vue router) — หนึ่งเมนูหนึ่ง path */
export const TAILADMIN_MY_PRIZES_START = "/my-prizes";
export const TAILADMIN_MY_HEARTS_START = "/my-hearts";
/** ประวัติหัวใจชมพู (ledger เฉพาะ delta ชมพู) */
export const TAILADMIN_PINK_HISTORY_START = "/pink-history";
export const TAILADMIN_MY_GAMES_START = "/my-games";
export const TAILADMIN_MY_SHOPS_START = "/my-shops";
export const TAILADMIN_MY_ORDERS_START = "/my-orders";
export const TAILADMIN_PRIZE_WITHDRAW_START = "/prize-withdraw-request";
export const TAILADMIN_HEARTS_TOP_UP_START = "/hearts-top-up";
export const TAILADMIN_GIVE_HEARTS_START = "/give-hearts";

/** สร้างเกม (ฝังฟอร์ม React ใน Vue สมาชิก) */
export const TAILADMIN_CREATE_GAME_START = "/create-game";

/** ตั้งค่าห้องเกมหลังสร้าง — ฝัง AdminCentralGamePanel (React) ในเชลล์สมาชิก */
export const TAILADMIN_GAME_STUDIO_START = "/game-studio";

/** ข้อความเมื่อเมนูยังไม่เปิด — แสดงใน iframe (TailAdmin bridge) สำหรับทุกยูสเซอร์ */
export const MEMBER_SHELL_CLOSED_PLACEHOLDER_MESSAGE =
  "ยังไม่เปิดให้ใช้บริการ";

/** ร้านค้าของฉัน · คำสั่งซื้อ — ปิดเนื้อหา Vue; URL สวยยังใช้ได้ แต่โชว์ข้อความแจ้งแทน */
export const MEMBER_SHELL_IFRAME_CLOSED_SLUGS = Object.freeze([
  "shops",
  "orders"
]);

export function isMemberShellIframeClosedSlug(slug) {
  if (slug == null || String(slug).trim() === "") return false;
  const s = String(slug)
    .trim()
    .toLowerCase()
    .split("/")
    .filter(Boolean)[0];
  return MEMBER_SHELL_IFRAME_CLOSED_SLUGS.includes(s);
}

/** ข้อความเต็มบนพื้นที่เนื้อหาเมื่อ slug ปิด — ใช้กับทุกยูสเซอร์ */
export function memberClosedShellPlaceholderText(slug) {
  const s = String(slug || "")
    .trim()
    .toLowerCase()
    .split("/")
    .filter(Boolean)[0];
  if (s === "shops") {
    return `${MEMBER_SHELL_CLOSED_PLACEHOLDER_MESSAGE} — ร้านค้าของฉัน`;
  }
  if (s === "orders") {
    return `${MEMBER_SHELL_CLOSED_PLACEHOLDER_MESSAGE} — คำสั่งซื้อ`;
  }
  return MEMBER_SHELL_CLOSED_PLACEHOLDER_MESSAGE;
}

/**
 * slug ใน URL สาธารณะ (เช่น /member/shops, /member/game) → path ใน Vue iframe
 * @type {Readonly<Record<string, string>>}
 */
export const MEMBER_SLUG_TO_TAIL = Object.freeze({
  prizes: TAILADMIN_MY_PRIZES_START,
  hearts: TAILADMIN_MY_HEARTS_START,
  "pink-history": TAILADMIN_PINK_HISTORY_START,
  game: TAILADMIN_MY_GAMES_START,
  shops: TAILADMIN_MY_SHOPS_START,
  orders: TAILADMIN_MY_ORDERS_START,
  "prize-withdraw": TAILADMIN_PRIZE_WITHDRAW_START,
  "hearts-top-up": TAILADMIN_HEARTS_TOP_UP_START,
  "give-hearts": TAILADMIN_GIVE_HEARTS_START,
  "create-game": TAILADMIN_CREATE_GAME_START,
  "game-studio": TAILADMIN_GAME_STUDIO_START
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
  s = s.replace(/\/+/g, "/");
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
  if (slug === "") return MEMBER_WORKSPACE_PATH;
  const seg = String(slug).replace(/^\/+/, "").replace(/\/+$/, "");
  return `${MEMBER_WORKSPACE_PATH}/${seg}`;
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
  const p =
    ((pathname || "").split("?")[0] || "/").replace(/\/+/g, "/").replace(/\/$/, "") ||
    "/";
  if (p === "/member") return { segments: [] };
  if (!p.startsWith("/member/")) return null;
  const rest = p.slice("/member/".length);
  const segments = rest.split("/").filter(Boolean).map((s) => s.trim().toLowerCase());
  return { segments };
}

/**
 * แยก segment หลัง `/admin` (`/admin` → [] , `/admin/shops` → ['shops'])
 * @returns {{ segments: string[] } | null}
 */
export function parseAdminAppPath(pathname) {
  const p =
    ((pathname || "").split("?")[0] || "/").replace(/\/+/g, "/").replace(/\/$/, "") ||
    "/";
  if (p === "/admin") return { segments: [] };
  if (!p.startsWith("/admin/")) return null;
  const rest = p.slice("/admin/".length);
  const segments = rest.split("/").filter(Boolean).map((s) => s.trim().toLowerCase());
  return { segments };
}

/** `/admin` หรือ `/admin/profile` — ใช้ slug เดียวกับสมาชิก */
export function adminAppPathFromSlug(slug) {
  if (slug == null) return ADMIN_WORKSPACE_PATH;
  const raw = String(slug).trim().toLowerCase();
  if (raw === "") return ADMIN_WORKSPACE_PATH;
  const first = raw.split("/").filter(Boolean)[0];
  if (!first || !(first in MEMBER_SLUG_TO_TAIL)) return ADMIN_WORKSPACE_PATH;
  return `${ADMIN_WORKSPACE_PATH}/${first}`;
}

/** จาก tail ใน Vue → URL `/admin/{slug}` */
export function adminAppPathForTail(tailPath) {
  const t = normalizeMemberTailPath(tailPath);
  const slug = MEMBER_TAIL_TO_SLUG[t];
  if (slug === undefined) return ADMIN_WORKSPACE_PATH;
  if (slug === "") return ADMIN_WORKSPACE_PATH;
  const seg = String(slug).replace(/^\/+/, "").replace(/\/+$/, "");
  return `${ADMIN_WORKSPACE_PATH}/${seg}`;
}

/**
 * URL หน้าเชลล์สมาชิก/แอดมิน
 * - สมาชิก: `/member/shops`
 * - แอดมิน: `/admin/shops` (path สวย — ไม่ใช้ query)
 * @param {string} tailPath เช่น "/" หรือ "/profile"
 * @param {"admin"|"member"|"owner"|string} [role]
 */
export function workspaceShellUrl(tailPath, role) {
  const path = normalizeMemberTailPath(tailPath);
  if (role === "admin") {
    return adminAppPathForTail(path);
  }
  return memberAppPathForTail(path);
}
