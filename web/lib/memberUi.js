/** บัญชีใหม่ = สมัครไม่เกิน N วัน — ซ่อนเมนูร้านใน header/หลังบ้าน (โฟกัสเกมก่อน) */
const NEW_MEMBER_SHOP_HIDE_DAYS = 30;

/**
 * แสดงลิงก์「ร้านของฉัน」ในเมนูสมาชิกหรือไม่
 * @param {{ role?: string; createdAt?: string | null } | null | undefined} user
 */
export function showMemberShopNav(user) {
  if (!user) return false;
  if (user.role === "owner" || user.role === "admin") return true;
  const raw = user.createdAt;
  if (raw == null || raw === "") return true;
  const t = new Date(raw).getTime();
  if (Number.isNaN(t)) return true;
  const graceMs = NEW_MEMBER_SHOP_HIDE_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - t >= graceMs;
}
