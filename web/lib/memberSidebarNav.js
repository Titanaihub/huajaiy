import {
  TAILADMIN_PROFILE_START,
  TAILADMIN_SHOP_DASHBOARD_START
} from "./memberWorkspacePath";

/**
 * เมนูสมาชิก — คงเชลล์ Next `/member` หรือ `/admin` + iframe เทมเพลตใหม่เท่านั้น
 * (ข้อมูลแสดงในหน้า Vue จาก API — ไม่ลิงก์ไปหน้า `/account/*` เก่า)
 *
 * tailStart: เส้นทางใน TailAdmin (Vue router) หลัง `huajaiy_start=`
 * kind: "shell" = เปลี่ยนหน้าใน iframe | "empty" = ยังไม่มีหน้าในเทมเพลต
 */
export const MEMBER_SHELL_MENU_ITEMS = [
  {
    key: "overview",
    label: "ภาพรวมบัญชี",
    kind: "shell",
    tailStart: TAILADMIN_SHOP_DASHBOARD_START
  },
  { key: "profile", label: "โปรไฟล์", kind: "shell", tailStart: TAILADMIN_PROFILE_START },
  /* รายการด้านล่าง: ยังใช้แดชบอร์ด `/` ชั่วคราว จนกว่าจะมี route+ดึงข้อมูลใน Vue */
  { key: "prizes", label: "รางวัลของฉัน", kind: "shell", tailStart: TAILADMIN_SHOP_DASHBOARD_START },
  { key: "hearts", label: "หัวใจของฉัน", kind: "shell", tailStart: TAILADMIN_SHOP_DASHBOARD_START },
  { key: "games", label: "เกมของฉัน", kind: "shell", tailStart: TAILADMIN_SHOP_DASHBOARD_START },
  { key: "shops", label: "ร้านค้าของฉัน", kind: "shell", tailStart: TAILADMIN_SHOP_DASHBOARD_START },
  { key: "page", label: "เพจของฉัน", kind: "empty" },
  { key: "orders", label: "คำสั่งซื้อ", kind: "shell", tailStart: TAILADMIN_SHOP_DASHBOARD_START },
  {
    key: "prizeWithdraw",
    label: "คำขอรับรางวัล",
    kind: "shell",
    tailStart: TAILADMIN_SHOP_DASHBOARD_START
  },
  {
    key: "heartsShop",
    label: "เติมหัวใจแดง",
    kind: "shell",
    tailStart: TAILADMIN_SHOP_DASHBOARD_START
  },
  { key: "giveHearts", label: "แจกหัวใจ", kind: "shell", tailStart: TAILADMIN_SHOP_DASHBOARD_START }
];
