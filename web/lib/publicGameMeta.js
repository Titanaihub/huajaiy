import { DEFAULT_CENTRAL_GAME_COVER_PATH } from "./centralGameDefaults";
import { getApiBase } from "./config";
import { mergeGameLobbyFromApi } from "./gameLobbyThemeDefaults";

/**
 * ดึงข้อมูลเกมส่วนกลางที่เปิดใช้ (เผยแพร่) — ใช้ใน Server Component
 */
export async function fetchPublicCentralGameMeta() {
  const base = getApiBase().replace(/\/$/, "");
  try {
    const r = await fetch(`${base}/api/game/meta?_nc=${Date.now()}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache"
      }
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

/** ธีมหน้า /game จาก API สาธารณะ (รวมค่าเริ่มต้น) */
export async function fetchPublicGameLobbyTheme() {
  const base = getApiBase().replace(/\/$/, "");
  try {
    const r = await fetch(`${base}/api/public/site-theme?_nc=${Date.now()}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache"
      }
    });
    if (!r.ok) return mergeGameLobbyFromApi(null);
    const data = await r.json();
    if (!data.ok || !data.theme) return mergeGameLobbyFromApi(null);
    return mergeGameLobbyFromApi(data.theme.gameLobby);
  } catch {
    return mergeGameLobbyFromApi(null);
  }
}

/** รายการเกมที่แสดงในหน้าเกม (ล็อบบี้) */
export async function fetchPublicGameList() {
  const base = getApiBase().replace(/\/$/, "");
  try {
    const r = await fetch(`${base}/api/game/list?_nc=${Date.now()}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache"
      }
    });
    if (!r.ok) return [];
    const data = await r.json();
    if (!data.ok || !Array.isArray(data.games)) return [];
    return data.games;
  } catch {
    return [];
  }
}

/**
 * meta เกมรายตัว (ต้องอยู่ในรายการเผยแพร่)
 * @param {string} gameRef — UUID หรือ game_code (รหัสสั้น)
 */
export async function fetchPublicCentralGameMetaById(gameRef) {
  const ref = String(gameRef || "").trim();
  if (!ref) return null;
  const base = getApiBase().replace(/\/$/, "");
  try {
    const r = await fetch(
      `${base}/api/game/meta?gameId=${encodeURIComponent(ref)}&_nc=${Date.now()}`,
      {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache"
        }
      }
    );
    if (!r.ok) return null;
    const data = await r.json();
    if (!data.ok || data.gameMode !== "central") return null;
    const title = String(data.title || "").trim();
    const description = String(data.description || "").trim();
    const customCover = String(data.gameCoverUrl || "").trim();
    const cu = String(data.creatorUsername || "").trim().toLowerCase();
    const pinkHeartCost = Math.max(0, Math.floor(Number(data.pinkHeartCost) || 0));
    const redHeartCost = Math.max(0, Math.floor(Number(data.redHeartCost) || 0));
    const heartCurrencyMode = data.heartCurrencyMode || "both";
    const acceptsPinkHearts = data.acceptsPinkHearts !== false;
    const resolvedId = String(data.gameId || "").trim() || ref;
    const gameCode =
      data.gameCode != null && String(data.gameCode).trim()
        ? String(data.gameCode).trim()
        : null;
    return {
      gameId: resolvedId,
      gameCode,
      title: title || "เกม",
      description,
      cardCount: Number(data.cardCount) || 0,
      setCount: Number(data.setCount) || 0,
      gameCoverUrl: customCover || null,
      coverImageUrl: customCover || DEFAULT_CENTRAL_GAME_COVER_PATH,
      creatorUsername: cu || null,
      pinkHeartCost,
      redHeartCost,
      heartCurrencyMode,
      acceptsPinkHearts
    };
  } catch {
    return null;
  }
}
