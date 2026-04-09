import { getApiBase } from "./config";

/**
 * เวลาแบบย่อภาษาไทยสำหรับการ์ดโพสต์
 * @param {string|null|undefined} iso
 */
export function formatRelativeTimeTh(iso) {
  if (iso == null || iso === "") return "";
  const d = new Date(iso);
  const t = d.getTime();
  if (Number.isNaN(t)) return "";
  const now = Date.now();
  const diffSec = (now - t) / 1000;
  if (diffSec < 45) return "เมื่อสักครู่";
  if (diffSec < 3600) {
    const m = Math.max(1, Math.floor(diffSec / 60));
    return `${m} นาทีที่แล้ว`;
  }
  if (diffSec < 86400) {
    const h = Math.max(1, Math.floor(diffSec / 3600));
    return `${h} ชม. ที่แล้ว`;
  }
  const dayDiff = Math.floor(diffSec / 86400);
  if (dayDiff === 1) return "เมื่อวาน";
  if (dayDiff < 7) return `${dayDiff} วันที่แล้ว`;
  try {
    return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

/**
 * โพสต์สมาชิกล่าสุดสำหรับหน้าแรก (SSR)
 * @param {number} [limit]
 */
export async function fetchHomeLatestMemberPosts(limit = 6) {
  const base = getApiBase().replace(/\/$/, "");
  const lim = Math.min(72, Math.max(1, Math.floor(Number(limit) || 6)));
  try {
    const r = await fetch(`${base}/api/public/home/member-posts?limit=${lim}&_nc=${Date.now()}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache"
      }
    });
    if (!r.ok) return [];
    const data = await r.json();
    if (!data.ok || !Array.isArray(data.posts)) return [];
    return data.posts;
  } catch {
    return [];
  }
}
