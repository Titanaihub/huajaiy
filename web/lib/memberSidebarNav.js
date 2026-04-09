import {
  isAdminDashboardShellSlug,
  MEMBER_SLUG_TO_TAIL,
  parseAdminAppPath,
  TAILADMIN_GIVE_HEARTS_START,
  TAILADMIN_HEARTS_TOP_UP_START,
  TAILADMIN_MY_GAMES_START,
  TAILADMIN_MY_HEARTS_START,
  TAILADMIN_MY_ORDERS_START,
  TAILADMIN_MY_PRIZES_START,
  TAILADMIN_MY_SHOPS_START,
  TAILADMIN_PINK_HISTORY_START,
  TAILADMIN_PRIZE_WITHDRAW_START,
  TAILADMIN_SHOP_DASHBOARD_START
} from "./memberWorkspacePath";

/**
 * เมนูสมาชิก — เชลล์ `/member` หรือ `/admin` + iframe TailAdmin
 *
 * tailStart: path ใน Vue — URL สาธารณะ `/member/...` (MEMBER_SLUG_TO_TAIL)
 * kind: "shell" | "closed" | "empty" | "legacy" | "publicPage"
 * closed = URL สวยเหมือน shell แต่แสดงข้อความ «ยังไม่เปิดให้ใช้บริการ» แทน iframe (ทุกยูส)
 */
export const MEMBER_SHELL_MENU_ITEMS = [
  {
    key: "overview",
    label: "ภาพรวมบัญชี",
    kind: "shell",
    tailStart: TAILADMIN_SHOP_DASHBOARD_START
  },
  { key: "prizes", label: "รางวัลของฉัน", kind: "shell", tailStart: TAILADMIN_MY_PRIZES_START },
  { key: "hearts", label: "เล่นเกม", kind: "shell", tailStart: TAILADMIN_MY_HEARTS_START },
  {
    key: "pinkHistory",
    label: "ประวัติหัวใจชมพู",
    kind: "shell",
    tailStart: TAILADMIN_PINK_HISTORY_START
  },
  { key: "games", label: "สร้างเกม", kind: "shell", tailStart: TAILADMIN_MY_GAMES_START },
  {
    key: "redeemRedCode",
    label: "ใส่รหัสหัวใจแดง",
    kind: "shell",
    tailStart: TAILADMIN_MY_GAMES_START
  },
  { key: "shops", label: "ร้านค้าของฉัน", kind: "closed", tailStart: TAILADMIN_MY_SHOPS_START },
  { key: "page", label: "เพจของฉัน", kind: "publicPage" },
  { key: "orders", label: "คำสั่งซื้อ", kind: "closed", tailStart: TAILADMIN_MY_ORDERS_START },
  {
    key: "prizeWithdraw",
    label: "คำขอถอนรางวัลถึงฉัน",
    kind: "shell",
    tailStart: TAILADMIN_PRIZE_WITHDRAW_START
  },
  {
    key: "heartsShop",
    label: "เติมหัวใจแดงไว้แจก",
    kind: "shell",
    tailStart: TAILADMIN_HEARTS_TOP_UP_START
  },
  { key: "giveHearts", label: "แจกหัวใจแดง", kind: "shell", tailStart: TAILADMIN_GIVE_HEARTS_START }
];

/** slug หลัง `/member/{slug}` → ชื่อเมนูภาษาไทย (สำหรับหัวข้อบนเทมเพลตกลาง) */
const EXTRA_SLUG_LABELS = Object.freeze({
  "create-game": "สร้างเกม",
  "game-studio": "สตูดิโอเกม"
});

/** @param {string | null | undefined} slug */
export function memberShellLabelForSlug(slug) {
  const first = String(slug || "")
    .split("/")
    .filter(Boolean)[0]
    ?.toLowerCase();
  if (!first) return "";
  const tail = MEMBER_SLUG_TO_TAIL[first];
  if (tail == null) {
    return EXTRA_SLUG_LABELS[first] || "";
  }
  const item = MEMBER_SHELL_MENU_ITEMS.find(
    (it) => "tailStart" in it && it.tailStart === tail
  );
  return item?.label || EXTRA_SLUG_LABELS[first] || "";
}

/** slug `/admin/{slug}` ที่เปิดแท็บแผง React — ชื่อบนแถบชมพู */
const ADMIN_SHELL_SLUG_LABELS = Object.freeze({
  members: "จัดการสมาชิก",
  theme: "ธีมเว็บไซต์",
  "all-shops": "ร้านค้าทั้งหมด",
  "game-settings": "ตั้งค่าเกม",
  "central-games": "เกมส่วนกลาง",
  "prize-payouts": "จ่ายรางวัล",
  "heart-packs": "แพ็กหัวใจ",
  "slip-approvals": "อนุมัติสลิป",
  "name-changes": "คำขอเปลี่ยนชื่อ"
});

/** @param {string | null | undefined} pathname */
export function adminPinkBarMenuLabelFromPathname(pathname) {
  const p = parseAdminAppPath(pathname);
  if (!p || p.segments.length === 0) return "ภาพรวมแอดมิน";
  const seg = p.segments[0]?.toLowerCase() || "";
  if (isAdminDashboardShellSlug(seg)) {
    return ADMIN_SHELL_SLUG_LABELS[seg] || seg;
  }
  return memberShellLabelForSlug(seg) || "แอดมิน";
}
