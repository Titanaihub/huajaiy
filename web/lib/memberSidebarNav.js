import {
  TAILADMIN_GIVE_HEARTS_START,
  TAILADMIN_HEARTS_TOP_UP_START,
  TAILADMIN_MY_GAMES_START,
  TAILADMIN_MY_HEARTS_START,
  TAILADMIN_MY_ORDERS_START,
  TAILADMIN_MY_PRIZES_START,
  TAILADMIN_MY_SHOPS_START,
  TAILADMIN_PROFILE_START,
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
  { key: "profile", label: "โปรไฟล์", kind: "shell", tailStart: TAILADMIN_PROFILE_START },
  { key: "prizes", label: "รางวัลของฉัน", kind: "shell", tailStart: TAILADMIN_MY_PRIZES_START },
  { key: "hearts", label: "หัวใจแดงห้องเกม", kind: "shell", tailStart: TAILADMIN_MY_HEARTS_START },
  { key: "games", label: "เกมของฉัน", kind: "shell", tailStart: TAILADMIN_MY_GAMES_START },
  { key: "shops", label: "ร้านค้าของฉัน", kind: "closed", tailStart: TAILADMIN_MY_SHOPS_START },
  { key: "page", label: "เพจของฉัน", kind: "publicPage" },
  { key: "orders", label: "คำสั่งซื้อ", kind: "closed", tailStart: TAILADMIN_MY_ORDERS_START },
  {
    key: "prizeWithdraw",
    label: "คำขอรับรางวัล",
    kind: "shell",
    tailStart: TAILADMIN_PRIZE_WITHDRAW_START
  },
  {
    key: "heartsShop",
    label: "เติมหัวใจแดง",
    kind: "shell",
    tailStart: TAILADMIN_HEARTS_TOP_UP_START
  },
  { key: "giveHearts", label: "แจกหัวใจแดง", kind: "shell", tailStart: TAILADMIN_GIVE_HEARTS_START }
];
