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

export async function apiCheckDuplicateName(payload) {
  const r = await fetch(`${apiRoot()}/api/auth/check-duplicate-name`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const ct = r.headers.get("content-type") || "";
  const data = ct.includes("application/json")
    ? await r.json().catch(() => ({}))
    : {};
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "ตรวจสอบชื่อไม่สำเร็จ");
  }
  return data;
}

export async function apiRegister(payload) {
  const r = await fetch(`${apiRoot()}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const ct = r.headers.get("content-type") || "";
  const data = ct.includes("application/json")
    ? await r.json().catch(() => ({}))
    : {};
  if (!r.ok || !data.ok) {
    const fallback =
      r.status === 0 || r.status >= 500
        ? "เซิร์ฟเวอร์ไม่ตอบหรือผิดพลาด — ลองใหม่ภายหลัง"
        : "สมัครสมาชิกไม่สำเร็จ";
    throw new Error(data.error || fallback);
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

export async function apiPatchProfile(token, body) {
  const r = await fetch(`${apiRoot()}/api/auth/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "บันทึกโปรไฟล์ไม่สำเร็จ");
  }
  return data;
}

export async function apiPostNameChangeRequest(token, body) {
  const r = await fetch(`${apiRoot()}/api/auth/name-change-request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "ส่งคำขอไม่สำเร็จ");
  }
  return data;
}

export async function apiGetMyPhoneHistory(token) {
  const r = await fetch(`${apiRoot()}/api/auth/phone-history/mine`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "โหลดประวัติเบอร์โทรไม่สำเร็จ");
  }
  return data;
}

export async function apiGetMyNameChangeRequests(token) {
  const r = await fetch(`${apiRoot()}/api/auth/name-change-requests/mine`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "โหลดประวัติคำขอไม่สำเร็จ");
  }
  return data;
}

export async function apiGetMyShops(token) {
  const r = await fetch(`${apiRoot()}/api/auth/shops/mine`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "โหลดร้านของฉันไม่สำเร็จ");
  }
  return data;
}

export async function apiGetMyCentralPrizeAwards(token) {
  const r = await fetch(`${apiRoot()}/api/auth/central-prize-awards/mine`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "โหลดรางวัลของฉันไม่สำเร็จ");
  }
  return data;
}

export async function apiGetMyHeartLedger(token, { limit = 80, offset = 0 } = {}) {
  const qs = new URLSearchParams({
    limit: String(limit),
    offset: String(offset)
  });
  const r = await fetch(`${apiRoot()}/api/auth/heart-ledger/mine?${qs}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "โหลดประวัติหัวใจไม่สำเร็จ");
  }
  return data;
}

export async function apiGetPrizeWithdrawalAvailable(token, creatorUsername) {
  const qs = new URLSearchParams({
    creatorUsername: String(creatorUsername || "").trim()
  });
  const r = await fetch(
    `${apiRoot()}/api/auth/central-prize-withdrawals/available?${qs}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "โหลดยอดถอนได้ไม่สำเร็จ");
  }
  return data;
}

export async function apiPostPrizeWithdrawalRequest(token, payload) {
  const r = await fetch(`${apiRoot()}/api/auth/central-prize-withdrawals`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    const err = new Error(data.error || "ส่งคำขอถอนไม่สำเร็จ");
    err.code = data.code;
    throw err;
  }
  return data;
}

export async function apiGetMyPrizeWithdrawals(token) {
  const r = await fetch(`${apiRoot()}/api/auth/central-prize-withdrawals/mine`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "โหลดประวัติคำขอถอนไม่สำเร็จ");
  }
  return data;
}

export async function apiGetCreatorWithdrawalStatus(token) {
  const r = await fetch(`${apiRoot()}/api/auth/central-prize-withdrawals/creator-status`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "โหลดสถานะไม่สำเร็จ");
  }
  return data;
}

export async function apiGetIncomingPrizeWithdrawals(token) {
  const r = await fetch(`${apiRoot()}/api/auth/central-prize-withdrawals/incoming`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "โหลดคำขอถอนไม่สำเร็จ");
  }
  return data;
}

export async function apiResolvePrizeWithdrawal(token, id, { action, note }) {
  const r = await fetch(
    `${apiRoot()}/api/auth/central-prize-withdrawals/${encodeURIComponent(id)}/resolve`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action, note: note || "" })
    }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "อัปเดตสถานะไม่สำเร็จ");
  }
  return data;
}
