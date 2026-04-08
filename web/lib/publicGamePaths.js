/**
 * ลิงก์เล่นเกมส่วนกลาง — ใช้ game_code สั้นเมื่อมี (เช่น /game/2026040801) ไม่งั้นใช้ UUID
 * @param {{ id?: string; gameCode?: string | null } | string} gameOrId
 */
export function publicCentralGamePlayPath(gameOrId) {
  if (gameOrId && typeof gameOrId === "object") {
    const code = String(gameOrId.gameCode || "").trim();
    if (code) return `/game/${encodeURIComponent(code)}`;
    const id = String(gameOrId.id || "").trim();
    if (id) return `/game/${encodeURIComponent(id)}`;
    return "/game";
  }
  const s = String(gameOrId || "").trim();
  return s ? `/game/${encodeURIComponent(s)}` : "/game";
}
