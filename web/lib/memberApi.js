import { getApiBase } from "./config";

export const MEMBER_TOKEN_KEY = "huajaiy_member_token";

function apiRoot() {
  return getApiBase().replace(/\/$/, "");
}

export function getMemberToken() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(MEMBER_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setMemberToken(token) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MEMBER_TOKEN_KEY, token);
}

export function clearMemberToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(MEMBER_TOKEN_KEY);
}

export async function apiRegister(payload) {
  const r = await fetch(`${apiRoot()}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "สมัครสมาชิกไม่สำเร็จ");
  }
  return data;
}

export async function apiLogin(payload) {
  const r = await fetch(`${apiRoot()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "เข้าสู่ระบบไม่สำเร็จ");
  }
  return data;
}

export async function apiMe(token) {
  const r = await fetch(`${apiRoot()}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "ไม่สามารถโหลดข้อมูลสมาชิก");
  }
  return data;
}
