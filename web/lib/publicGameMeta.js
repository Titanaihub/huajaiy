import { DEFAULT_CENTRAL_GAME_COVER_PATH } from "./centralGameDefaults";
import { getApiBase } from "./config";

/**
 * ดึงข้อมูลเกมส่วนกลางที่เปิดใช้ (เผยแพร่) — ใช้ใน Server Component
 */
export async function fetchPublicCentralGameMeta() {
  const base = getApiBase().replace(/\/$/, "");
  try {
    const r = await fetch(`${base}/api/game/meta`, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!r.ok) return null;
    const data = await r.json();
    if (!data.ok || data.gameMode !== "central") return null;
    const title = String(data.title || "").trim();
    const description = String(data.description || "").trim();
    const customCover = String(data.gameCoverUrl || "").trim();
    return {
      title: title || "เกมส่วนกลาง",
      description,
      cardCount: Number(data.cardCount) || 0,
      setCount: Number(data.setCount) || 0,
      gameCoverUrl: customCover || null,
      coverImageUrl: customCover || DEFAULT_CENTRAL_GAME_COVER_PATH
    };
  } catch {
    return null;
  }
}

/** รายการเกมที่แสดงในหน้าเกม (ล็อบบี้) */
export async function fetchPublicGameList() {
  const base = getApiBase().replace(/\/$/, "");
  try {
    const r = await fetch(`${base}/api/game/list`, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!r.ok) return [];
    const data = await r.json();
    if (!data.ok || !Array.isArray(data.games)) return [];
    return data.games;
  } catch {
    return [];
  }
}

/** meta เกมรายตัว (ต้องอยู่ในรายการเผยแพร่) — สำหรับหน้าเล่น /game/[id] */
export async function fetchPublicCentralGameMetaById(gameId) {
  const id = String(gameId || "").trim();
  if (!id) return null;
  const base = getApiBase().replace(/\/$/, "");
  try {
    const r = await fetch(`${base}/api/game/meta?gameId=${encodeURIComponent(id)}`, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!r.ok) return null;
    const data = await r.json();
    if (!data.ok || data.gameMode !== "central") return null;
    const title = String(data.title || "").trim();
    const description = String(data.description || "").trim();
    const customCover = String(data.gameCoverUrl || "").trim();
    return {
      gameId: data.gameId || id,
      title: title || "เกม",
      description,
      cardCount: Number(data.cardCount) || 0,
      setCount: Number(data.setCount) || 0,
      gameCoverUrl: customCover || null,
      coverImageUrl: customCover || DEFAULT_CENTRAL_GAME_COVER_PATH
    };
  } catch {
    return null;
  }
}
