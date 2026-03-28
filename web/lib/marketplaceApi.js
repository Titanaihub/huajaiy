import { getApiBase } from "./config";

function apiRoot() {
  return getApiBase().replace(/\/$/, "");
}

export async function fetchMarketplaceProducts(params = {}) {
  const u = new URL(`${apiRoot()}/api/marketplace/products`);
  if (params.q) u.searchParams.set("q", params.q);
  if (params.category) u.searchParams.set("category", params.category);
  if (params.shopId) u.searchParams.set("shopId", params.shopId);
  if (params.limit != null) u.searchParams.set("limit", String(params.limit));
  if (params.offset != null) u.searchParams.set("offset", String(params.offset));
  const r = await fetch(u.toString(), { cache: "no-store" });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    return {
      ok: false,
      error: data.error || "โหลดสินค้าไม่สำเร็จ",
      products: [],
      total: 0
    };
  }
  return {
    ok: true,
    products: data.products || [],
    total: data.total ?? 0,
    limit: data.limit,
    offset: data.offset
  };
}

export async function fetchMarketplaceProduct(id) {
  const r = await fetch(`${apiRoot()}/api/marketplace/products/${id}`, {
    cache: "no-store"
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    return { ok: false, error: data.error || "ไม่พบสินค้า", product: null };
  }
  return { ok: true, product: data.product };
}

export async function fetchMarketplaceResolve(ids) {
  if (!ids.length) return { ok: true, products: [] };
  const u = new URL(`${apiRoot()}/api/marketplace/products/resolve`);
  u.searchParams.set("ids", ids.join(","));
  const r = await fetch(u.toString(), { cache: "no-store" });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    return {
      ok: false,
      error: data.error || "โหลดข้อมูลตะกร้าไม่สำเร็จ",
      products: []
    };
  }
  return { ok: true, products: data.products || [] };
}

export async function fetchMarketplaceCategories() {
  const r = await fetch(`${apiRoot()}/api/marketplace/categories`, {
    cache: "no-store"
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    return { ok: false, categories: [] };
  }
  return { ok: true, categories: data.categories || [] };
}

export async function fetchMarketplaceShops() {
  const r = await fetch(`${apiRoot()}/api/marketplace/shops`, {
    cache: "no-store"
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    return { ok: false, shops: [] };
  }
  return { ok: true, shops: data.shops || [] };
}
