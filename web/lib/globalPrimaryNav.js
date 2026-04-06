/** เมนูหลักก่อนช่องเข้า/ออกระบบ — ช่องสุดท้ายสลับใน GlobalPrimaryNav / HomeStylePublicHeader */
export const GLOBAL_PRIMARY_NAV_BASE = [
  { href: "/", label: "หน้าแรก" },
  { href: "/game", label: "เกมและรางวัล" },
  { href: "/shop", label: "ร้านค้า" },
  { href: "/page", label: "เพจชุมชน" }
];

/** @deprecated ใช้ GLOBAL_PRIMARY_NAV_BASE + ปุ่มเข้า/ออก แยก */
export const GLOBAL_PRIMARY_NAV = [
  ...GLOBAL_PRIMARY_NAV_BASE,
  { href: "/login", label: "เข้าสู่ระบบ" }
];
