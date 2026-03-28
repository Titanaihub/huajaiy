import { getApiBase } from "./config";
import { getMemberToken } from "./memberApi";

function apiRoot() {
  return getApiBase().replace(/\/$/, "");
}

/** บันทึกออเดอร์บนเซิร์ฟเวอร์ (ต้องล็อกอิน) */
export async function postServerOrder(body) {
  const token = getMemberToken();
  if (!token) return { ok: false, skipped: true };

  const r = await fetch(`${apiRoot()}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    return { ok: false, error: data.error || "บันทึกออเดอร์ไม่สำเร็จ" };
  }
  return { ok: true, order: data.order };
}

/** ออเดอร์มาร์เก็ตเพลส (ตัดสต็อก · รอชำระเงิน) */
export async function postMarketplaceOrder({ lines, shippingAddress }) {
  const token = getMemberToken();
  if (!token) {
    return { ok: false, error: "กรุณาเข้าสู่ระบบก่อนยืนยันออเดอร์" };
  }
  const r = await fetch(`${apiRoot()}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      kind: "marketplace",
      lines,
      shippingAddress
    })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    return {
      ok: false,
      error: data.error || "ยืนยันออเดอร์ไม่สำเร็จ"
    };
  }
  return { ok: true, order: data.order };
}

export async function fetchServerOrders() {
  const token = getMemberToken();
  if (!token) return { ok: false, orders: [] };

  const r = await fetch(`${apiRoot()}/api/orders/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    return { ok: false, orders: [], error: data.error };
  }
  return { ok: true, orders: data.orders || [] };
}
