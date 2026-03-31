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

/** สร้างรายการสั่งซื้อ — slipUrl ไม่ส่งได้ (แนบทีหลังด้วย apiAttachHeartPurchaseSlip) */
export async function apiCreateHeartPurchase(packageId, slipUrl) {
  const token = getMemberToken();
  if (!token) throw new Error("กรุณาเข้าสู่ระบบ");
  const body = { packageId };
  if (slipUrl != null && String(slipUrl).trim()) {
    body.slipUrl = slipUrl;
  }
  const r = await fetch(`${apiRoot()}/api/hearts/purchases`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "ส่งคำขอไม่สำเร็จ");
  return data;
}

export async function apiAttachHeartPurchaseSlip(purchaseId, slipUrl) {
  const token = getMemberToken();
  if (!token) throw new Error("กรุณาเข้าสู่ระบบ");
  const r = await fetch(
    `${apiRoot()}/api/hearts/purchases/${encodeURIComponent(purchaseId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ slipUrl })
    }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "แนบสลิปไม่สำเร็จ");
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
