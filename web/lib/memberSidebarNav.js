/**
 * เมนูสมาชิก (sidebar iframe + หัวเว็บ «เพิ่มเติม») — ชี้หน้าเว็บเดิมที่มีข้อมูลจริง
 * kind: "path" = ลิงก์ได้ | "empty" = ยังไม่มีหน้า (แสดงเป็นปิดใช้งาน)
 */
export const MEMBER_SIDEBAR_NAV_ITEMS = [
  { key: "overview", label: "ภาพรวมบัญชี", kind: "path", href: "/account" },
  { key: "profile", label: "โปรไฟล์", kind: "path", href: "/account/profile" },
  { key: "prizes", label: "รางวัลของฉัน", kind: "path", href: "/account/prizes" },
  { key: "hearts", label: "หัวใจของฉัน", kind: "path", href: "/account/my-hearts" },
  { key: "games", label: "เกมของฉัน", kind: "path", href: "/account/my-games" },
  { key: "shops", label: "ร้านค้าของฉัน", kind: "path", href: "/account/shops" },
  { key: "page", label: "เพจของฉัน", kind: "empty" },
  { key: "orders", label: "คำสั่งซื้อ", kind: "path", href: "/account/orders" },
  {
    key: "prizeWithdraw",
    label: "คำขอรับรางวัล",
    kind: "path",
    href: "/account/prize-withdraw"
  },
  { key: "heartsShop", label: "เติมหัวใจแดง", kind: "path", href: "/account/hearts-shop" },
  { key: "giveHearts", label: "แจกหัวใจ", kind: "path", href: "/account/give-hearts" }
];

/** ลิงก์ไอคอนโปรไฟล์หัวเว็บ — หน้าโปรไฟล์เดิม */
export const MEMBER_PROFILE_PAGE_HREF = "/account/profile";
