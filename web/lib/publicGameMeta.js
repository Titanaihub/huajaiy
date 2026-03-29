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
    return {
      title: title || "เกมส่วนกลาง",
      description,
      cardCount: Number(data.cardCount) || 0,
      setCount: Number(data.setCount) || 0
    };
  } catch {
    return null;
  }
}
