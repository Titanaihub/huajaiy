import { getApiBase } from "./config";

function apiRoot() {
  return getApiBase().replace(/\/$/, "");
}

export async function apiListShopProducts(token, shopId) {
  const r = await fetch(`${apiRoot()}/api/shops/${shopId}/products`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "โหลดสินค้าไม่สำเร็จ");
  }
  return data;
}

export async function apiCreateShopProduct(token, shopId, body) {
  const r = await fetch(`${apiRoot()}/api/shops/${shopId}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "สร้างสินค้าไม่สำเร็จ");
  }
  return data.product;
}

export async function apiPatchShopProduct(token, shopId, productId, body) {
  const r = await fetch(
    `${apiRoot()}/api/shops/${shopId}/products/${productId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "บันทึกไม่สำเร็จ");
  }
  return data.product;
}

export async function apiDeleteShopProduct(token, shopId, productId) {
  const r = await fetch(
    `${apiRoot()}/api/shops/${shopId}/products/${productId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "ลบไม่สำเร็จ");
  }
}
