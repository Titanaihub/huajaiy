/** รูปหน้าปกเกมส่วนกลางเมื่อแอดมินไม่อัปโหลด — หัวใจชมพู (สาธารณะใต้ /public) */
export const DEFAULT_CENTRAL_GAME_COVER_PATH = "/game-cover-default-pink.svg";

/** รูปหน้าปิดป้าย (ก่อนเปิด) เมื่อแอดมินไม่ตั้ง URL — SVG ใต้ /public */
export const DEFAULT_TILE_BACK_COVER_PATH = "/game-tile-back-default.svg";

/**
 * ค่าเริ่มต้นตอน「เปิดห้องเกม」จากแบบฟอร์ม — ต้องผ่าน assertHeartEconomyValid ฝั่ง API
 * (โหมด both + 0/0 จะถูกปฏิเสธ) · ผู้สร้างปรับโหมด/ยอดได้ในขั้นตอนตั้งค่าเกม
 */
export const DEFAULT_NEW_ROOM_HEART_PRESET = {
  heartCurrencyMode: "red_only",
  pinkHeartCost: 0,
  redHeartCost: 1,
  acceptsPinkHearts: true
};
