import { getApiBase } from "./config";
import { getMemberToken } from "./memberApi";

function apiRoot() {
  return getApiBase().replace(/\/$/, "");
}

export async function apiHeartPackages() {
  const r = await fetch(`${apiRoot()}/api/hearts/packages`, { cache: "no-store" });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "โหลดแพ็กเกจไม่สำเร็จ");
  return data;
}

export async function apiCreateHeartPurchase(packageId, slipUrl) {
  const token = getMemberToken();
  if (!token) throw new Error("กรุณาเข้าสู่ระบบ");
  const r = await fetch(`${apiRoot()}/api/hearts/purchases`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ packageId, slipUrl })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "ส่งคำขอไม่สำเร็จ");
  return data;
}

export async function apiMyHeartPurchases() {
  const token = getMemberToken();
  if (!token) throw new Error("กรุณาเข้าสู่ระบบ");
  const r = await fetch(`${apiRoot()}/api/hearts/purchases/mine`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "โหลดประวัติไม่สำเร็จ");
  return data;
}
