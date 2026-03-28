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

export async function apiAdminListMembers(token, { q, limit, offset } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (limit != null) params.set("limit", String(limit));
  if (offset != null) params.set("offset", String(offset));
  const qs = params.toString();
  const url = `${apiRoot()}/api/admin/members${qs ? `?${qs}` : ""}`;
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "โหลดรายชื่อสมาชิกไม่สำเร็จ");
  return data;
}

export async function apiAdminMember(token, id) {
  const r = await fetch(`${apiRoot()}/api/admin/members/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "โหลดข้อมูลสมาชิกไม่สำเร็จ");
  return data;
}

export async function apiAdminNameChangeRequests(token) {
  const r = await fetch(`${apiRoot()}/api/admin/name-change-requests`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "โหลดคำขอเปลี่ยนชื่อไม่สำเร็จ");
  return data;
}

export async function apiAdminApproveNameChange(token, id, note) {
  const r = await fetch(
    `${apiRoot()}/api/admin/name-change-requests/${encodeURIComponent(id)}/approve`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(note != null && note !== "" ? { note } : {})
    }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "อนุมัติไม่สำเร็จ");
  return data;
}

export async function apiAdminRejectNameChange(token, id, note) {
  const r = await fetch(
    `${apiRoot()}/api/admin/name-change-requests/${encodeURIComponent(id)}/reject`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(note != null && note !== "" ? { note } : {})
    }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "ปฏิเสธไม่สำเร็จ");
  return data;
}
