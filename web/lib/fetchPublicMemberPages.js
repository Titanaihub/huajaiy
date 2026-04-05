import { getApiBase } from "./config";

/** ดึงรายการเพจสมาชิกสำหรับหน้า /page — RSC */
export async function fetchPublicMemberPages(limit = 24) {
  const base = getApiBase().replace(/\/$/, "");
  const lim = Math.min(48, Math.max(1, Math.floor(Number(limit) || 24)));
  const r = await fetch(
    `${base}/api/public/member-pages?limit=${encodeURIComponent(String(lim))}`,
    { cache: "no-store", headers: { Accept: "application/json" } }
  );
  if (!r.ok) return [];
  const data = await r.json().catch(() => ({}));
  if (!data.ok || !Array.isArray(data.members)) return [];
  return data.members;
}
