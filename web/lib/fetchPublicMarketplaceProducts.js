import { getApiBase } from "./config";

/**
 * สินค้าในตลาดสาธารณะ — ใช้ใน RSC (หน้าแรก ฯลฯ)
 */
export async function fetchPublicMarketplaceProducts(limit = 8) {
  const base = getApiBase().replace(/\/$/, "");
  const lim = Math.min(Math.max(Number(limit) || 8, 1), 24);
  try {
    const r = await fetch(`${base}/api/marketplace/products?limit=${lim}&offset=0`, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!r.ok) return [];
    const data = await r.json().catch(() => ({}));
    if (!data.ok || !Array.isArray(data.products)) return [];
    return data.products;
  } catch {
    return [];
  }
}
