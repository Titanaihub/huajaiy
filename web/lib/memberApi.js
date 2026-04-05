import { getApiBase } from "./config";

export const MEMBER_TOKEN_KEY = "huajaiy_member_token";

/** เก็บโทเค็นแอดมินไว้คืนหลังออกจากโหมดดูในนามสมาชิก */
export const IMPERSONATION_RETURN_TOKEN_KEY = "huajaiy_impersonation_return_token";

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

export async function apiPatchPassword(token, body) {
  const r = await fetch(`${apiRoot()}/api/auth/password`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
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

/** ผู้ชนะยืนยันรับรางวัลสิ่งของแบบมารับเอง — แจ้งผู้สร้างเกม */
export async function apiPostWinnerPickupAck(token, awardId) {
  const r = await fetch(
    `${apiRoot()}/api/auth/central-prize-awards/${encodeURIComponent(awardId)}/winner-pickup-ack`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "บันทึกการรับรางวัลไม่สำเร็จ");
  }
  return data;
}

export async function apiGetMyHeartLedger(
  token,
  { limit = 80, offset = 0, pinkOnly = false } = {}
) {
  const qs = new URLSearchParams({
    limit: String(limit),
    offset: String(offset)
  });
  if (pinkOnly) qs.set("pinkOnly", "1");
  const r = await fetch(`${apiRoot()}/api/auth/heart-ledger/mine?${qs}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "โหลดประวัติหัวใจไม่สำเร็จ");
  }
  return data;
}

export async function apiGetMyRoomRedRedemptions(token, { limit = 300 } = {}) {
  const qs = new URLSearchParams({ limit: String(limit) });
  const r = await fetch(`${apiRoot()}/api/auth/room-red-redemptions/mine?${qs}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "โหลดประวัติแลกรหัสหัวใจแดงไม่สำเร็จ");
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

export async function apiCancelPrizeWithdrawalRequest(token, id) {
  const r = await fetch(
    `${apiRoot()}/api/auth/central-prize-withdrawals/${encodeURIComponent(id)}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "ยกเลิกคำขอไม่สำเร็จ");
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

export async function apiGetIncomingPrizeAwards(token, { limit } = {}) {
  const q = new URLSearchParams();
  if (limit != null) q.set("limit", String(limit));
  const qs = q.toString();
  const r = await fetch(
    `${apiRoot()}/api/auth/central-prize-awards/incoming${qs ? `?${qs}` : ""}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "โหลดประวัติผู้ได้รับรางวัลไม่สำเร็จ");
  }
  return data;
}

export async function apiResolvePrizeWithdrawal(
  token,
  id,
  { action, note, transferSlipUrl, transferDate }
) {
  const body = { action, note: note || "" };
  if (transferSlipUrl != null && String(transferSlipUrl).trim()) {
    body.transferSlipUrl = String(transferSlipUrl).trim();
  }
  if (transferDate != null && String(transferDate).trim()) {
    body.transferDate = String(transferDate).trim().slice(0, 10);
  }
  const r = await fetch(
    `${apiRoot()}/api/auth/central-prize-withdrawals/${encodeURIComponent(id)}/resolve`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "อัปเดตสถานะไม่สำเร็จ");
  }
  return data;
}

export async function apiResolveIncomingItemAward(
  token,
  id,
  { mode, status, note, trackingCode }
) {
  const body = {
    mode: String(mode || "").trim(),
    status: String(status || "").trim()
  };
  if (note != null && String(note).trim()) body.note = String(note).trim();
  if (trackingCode != null && String(trackingCode).trim()) {
    body.trackingCode = String(trackingCode).trim();
  }
  const r = await fetch(
    `${apiRoot()}/api/auth/central-prize-awards/${encodeURIComponent(id)}/item-resolve`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "อัปเดตสถานะรางวัลสิ่งของไม่สำเร็จ");
  }
  return data;
}

/** รายการเกมเผยแพร่ — ใช้จับคู่เจ้าของห้องกับลิงก์เล่น */
export async function apiListPublishedGames() {
  const r = await fetch(`${apiRoot()}/api/game/list?_nc=${Date.now()}`, {
    cache: "no-store"
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "โหลดรายการเกมไม่สำเร็จ");
  }
  return data;
}

/** รหัสแจกหัวใจแดงห้องเกม — POST /api/hearts/room-red-codes (codeCount>1 = หลายรหัส คนละครั้ง) */
export async function apiCreateRoomRedGiftCode(
  token,
  { redAmount, maxUses = 1, codeCount = 1, expiresAt = null }
) {
  const r = await fetch(`${apiRoot()}/api/hearts/room-red-codes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ redAmount, maxUses, codeCount, expiresAt })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "สร้างรหัสไม่สำเร็จ");
  }
  return data;
}

export async function apiListRoomRedGiftCodes(token) {
  const r = await fetch(`${apiRoot()}/api/hearts/room-red-codes/mine`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "โหลดรหัสไม่สำเร็จ");
  }
  return data;
}

/** รหัสแจก + ผู้แลก ตาม ledger meta.codeIds — GET batch-detail?ids= */
export async function apiGetRoomRedCodesBatchDetail(token, codeIds) {
  const ids = Array.isArray(codeIds)
    ? codeIds.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  if (ids.length === 0) {
    throw new Error("ไม่มีรหัสอ้างอิง");
  }
  const qs = new URLSearchParams({ ids: ids.join(",") });
  const r = await fetch(
    `${apiRoot()}/api/hearts/room-red-codes/batch-detail?${qs.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "โหลดรายละเอียดรหัสไม่สำเร็จ");
  }
  return data;
}

export async function apiDeleteRoomRedGiftCode(token, codeId) {
  const r = await fetch(
    `${apiRoot()}/api/hearts/room-red-codes/${encodeURIComponent(codeId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "ลบรหัสไม่สำเร็จ");
  }
  return data;
}

export async function apiRedeemRoomRedGiftCode(token, code) {
  const r = await fetch(`${apiRoot()}/api/hearts/room-red-redeem`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ code })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "แลกรหัสไม่สำเร็จ");
  }
  return data;
}

/** โพสต์เพจสมาชิก (สาธารณะ) */
export async function apiFetchPublicMemberPosts(username) {
  const un = String(username || "").trim();
  if (!un) return { ok: true, posts: [] };
  const r = await fetch(
    `${apiRoot()}/api/public/members/${encodeURIComponent(un)}/posts`,
    { cache: "no-store", headers: { Accept: "application/json" } }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    return { ok: false, posts: [], error: data.error };
  }
  return data;
}

export async function apiMyPublicPosts(token) {
  const r = await fetch(`${apiRoot()}/api/auth/my-public-posts`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "โหลดโพสต์ไม่สำเร็จ");
  }
  return data;
}

export async function apiCreateMyPublicPost(token, body) {
  const r = await fetch(`${apiRoot()}/api/auth/my-public-posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "สร้างโพสต์ไม่สำเร็จ");
  }
  return data;
}

export async function apiPatchMyPublicPost(token, id, body) {
  const r = await fetch(
    `${apiRoot()}/api/auth/my-public-posts/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "บันทึกโพสต์ไม่สำเร็จ");
  }
  return data;
}

export async function apiDeleteMyPublicPost(token, id) {
  const r = await fetch(
    `${apiRoot()}/api/auth/my-public-posts/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "ลบโพสต์ไม่สำเร็จ");
  }
  return data;
}

/** กดแชร์จากเว็บขณะไม่ล็อกอิน — นับเป็นผู้เยี่ยมชม */
export async function apiPublicPostShareIntent(pageUsername, postId, channel) {
  const r = await fetch(
    `${apiRoot()}/api/public/members/${encodeURIComponent(pageUsername)}/posts/${encodeURIComponent(postId)}/share-intent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ channel })
    }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "บันทึกการแชร์ไม่สำเร็จ");
  }
  return data;
}

export async function apiPostShareIntent(token, postId, channel) {
  const r = await fetch(
    `${apiRoot()}/api/auth/my-public-posts/${encodeURIComponent(postId)}/share-intent`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ channel })
    }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "บันทึกการแชร์ไม่สำเร็จ");
  }
  return data;
}

export async function apiGetPostShareStats(token, postId) {
  const r = await fetch(
    `${apiRoot()}/api/auth/my-public-posts/${encodeURIComponent(postId)}/share-stats`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "โหลดสถิติไม่สำเร็จ");
  }
  return data;
}
