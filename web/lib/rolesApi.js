import { getApiBase } from "./config";

function apiRoot() {
  return getApiBase().replace(/\/$/, "");
}

export async function apiAdminPing(token) {
  const r = await fetch(`${apiRoot()}/api/admin/ping`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "เรียก API ไม่สำเร็จ");
  return data;
}

export async function apiOwnerPing(token) {
  const r = await fetch(`${apiRoot()}/api/owner/ping`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "เรียก API ไม่สำเร็จ");
  return data;
}

export async function apiOwnerShops(token) {
  const r = await fetch(`${apiRoot()}/api/owner/shops`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "เรียก API ไม่สำเร็จ");
  return data;
}
