/**
 * ยอดหัวใจสำหรับหัวเว็บสมาชิก + ภาพรวมบัญชี (ตรงกับ user จาก GET /api/auth/me)
 * - pink: หัวใจชมพูจากระบบส่วนกลาง
 * - redFromUsers: แดงในกระเป๋า + แดงในห้องเกม (จากผู้เล่น/ยูสอื่นในห้อง)
 * - giveawayRed: แดงสำหรับแจก (ห้อง/แคมเปญ)
 * @param {object | null | undefined} user
 */
export function heartTotalsFromPublicUser(user) {
  if (!user || typeof user !== "object") {
    return { pink: 0, redFromUsers: 0, giveawayRed: 0 };
  }
  const pink = Math.max(0, Math.floor(Number(user.pinkHeartsBalance) || 0));
  const walletRed = Math.max(0, Math.floor(Number(user.redHeartsBalance) || 0));
  const rows = Array.isArray(user.roomGiftRed) ? user.roomGiftRed : [];
  const roomRed = rows.reduce(
    (s, x) => s + Math.max(0, Math.floor(Number(x.balance) || 0)),
    0
  );
  const giveawayRed = Math.max(0, Math.floor(Number(user.redGiveawayBalance) || 0));
  return {
    pink,
    redFromUsers: walletRed + roomRed,
    giveawayRed
  };
}
