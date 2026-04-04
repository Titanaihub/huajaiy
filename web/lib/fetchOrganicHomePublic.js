import { getApiBase } from "./config";

/** ดึง organicHome จาก API สาธารณะ — ใช้ใน RSC (เช่น /page) */
export async function fetchOrganicHomePublic() {
  const base = getApiBase().replace(/\/$/, "");
  const r = await fetch(`${base}/api/public/organic-home`, {
    cache: "no-store",
    headers: { Accept: "application/json" }
  });
  if (!r.ok) return null;
  const data = await r.json().catch(() => ({}));
  if (!data.ok || !data.organicHome) return null;
  return data.organicHome;
}
