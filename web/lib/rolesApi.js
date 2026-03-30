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

export async function apiAdminMemberFull(token, id) {
  const r = await fetch(
    `${apiRoot()}/api/admin/members/${encodeURIComponent(id)}/full`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "โหลดข้อมูลสมาชิกไม่สำเร็จ");
  return data;
}

/** @param body { Record<string, unknown> } โปรไฟล์ — ส่งเฉพาะฟิลด์ที่ต้องการแก้ */
export async function apiAdminPatchMember(token, id, body) {
  const r = await fetch(`${apiRoot()}/api/admin/members/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "บันทึกโปรไฟล์ไม่สำเร็จ");
  return data;
}

/** @param body {{ pinkDelta?: number, redDelta?: number, redGiveawayDelta?: number } | { delta: number }} */
export async function apiAdminAdjustMemberHearts(token, id, body) {
  const r = await fetch(
    `${apiRoot()}/api/admin/members/${encodeURIComponent(id)}/hearts`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "ปรับหัวใจไม่สำเร็จ");
  return data;
}

export async function apiAdminSetMemberPassword(token, id, newPassword) {
  const r = await fetch(
    `${apiRoot()}/api/admin/members/${encodeURIComponent(id)}/password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ newPassword })
    }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "ตั้งรหัสไม่สำเร็จ");
  return data;
}

export async function apiAdminShops(token) {
  const r = await fetch(`${apiRoot()}/api/admin/shops`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "โหลดร้านไม่สำเร็จ");
  return data;
}

/** @param body {{ name: string, slug?: string, ownerUsername?: string, ownerUserId?: string }} */
export async function apiAdminCreateShop(token, body) {
  const r = await fetch(`${apiRoot()}/api/admin/shops`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "สร้างร้านไม่สำเร็จ");
  return data;
}

export async function apiAdminGame(token) {
  const r = await fetch(`${apiRoot()}/api/admin/game`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "โหลดข้อมูลเกมไม่สำเร็จ");
  return data;
}

export async function apiAdminCentralGamesList(token) {
  const r = await fetch(`${apiRoot()}/api/admin/central-games`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "โหลดรายการเกมไม่สำเร็จ");
  return data;
}

/** รายการผู้ได้รางวัลจากเกมส่วนกลาง (แอดมิน — ติดตามการจ่าย) */
export async function apiAdminCentralPrizeAwards(token, { gameId, limit } = {}) {
  const params = new URLSearchParams();
  if (gameId) params.set("gameId", String(gameId));
  if (limit != null) params.set("limit", String(limit));
  const qs = params.toString();
  const url = `${apiRoot()}/api/admin/central-prize-awards${qs ? `?${qs}` : ""}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "โหลดรายการรางวัลไม่สำเร็จ");
  return data;
}

/** คำขอถอน (รอดำเนินการ + รายการย้อนหลัง + ยอดจองต่อสมาชิก) — แอดมิน */
export async function apiAdminCentralPrizeWithdrawalData(token, { withdrawalsLimit } = {}) {
  const params = new URLSearchParams();
  if (withdrawalsLimit != null) params.set("withdrawalsLimit", String(withdrawalsLimit));
  const qs = params.toString();
  const url = `${apiRoot()}/api/admin/central-prize-withdrawals/admin-data${qs ? `?${qs}` : ""}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "โหลดข้อมูลคำขอถอนไม่สำเร็จ");
  return data;
}

export async function apiAdminResolvePrizeWithdrawal(token, id, body) {
  const r = await fetch(
    `${apiRoot()}/api/admin/central-prize-withdrawals/${encodeURIComponent(id)}/admin-resolve`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body || {})
    }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "อัปเดตคำขอถอนไม่สำเร็จ");
  return data;
}

export async function apiAdminCentralGameDetail(token, id) {
  const r = await fetch(`${apiRoot()}/api/admin/central-games/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "โหลดเกมไม่สำเร็จ");
  return data;
}

export async function apiAdminCentralGameCreate(token, body) {
  const r = await fetch(`${apiRoot()}/api/admin/central-games`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "สร้างเกมไม่สำเร็จ");
  return data;
}

export async function apiAdminCentralGamePatch(token, id, body) {
  const r = await fetch(`${apiRoot()}/api/admin/central-games/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
  return data;
}

export async function apiAdminCentralGamePutImages(token, id, images, options = {}) {
  const r = await fetch(
    `${apiRoot()}/api/admin/central-games/${encodeURIComponent(id)}/images`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        images,
        oneImagePerSet: Boolean(options.oneImagePerSet)
      })
    }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "บันทึกรูปไม่สำเร็จ");
  return data;
}

export async function apiAdminCentralGamePutRules(token, id, rules) {
  const r = await fetch(
    `${apiRoot()}/api/admin/central-games/${encodeURIComponent(id)}/rules`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ rules })
    }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "บันทึกกติกาไม่สำเร็จ");
  return data;
}

export async function apiAdminCentralGameActivate(token, id) {
  const r = await fetch(
    `${apiRoot()}/api/admin/central-games/${encodeURIComponent(id)}/activate`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "เปิดใช้เกมไม่สำเร็จ");
  return data;
}

export async function apiAdminCentralGameDeactivate(token, id) {
  const r = await fetch(
    `${apiRoot()}/api/admin/central-games/${encodeURIComponent(id)}/deactivate`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "ปิดใช้ไม่สำเร็จ");
  return data;
}

export async function apiAdminCentralGameDelete(token, id) {
  const r = await fetch(`${apiRoot()}/api/admin/central-games/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "ลบเกมไม่สำเร็จ");
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

export async function apiAdminHeartPackages(token) {
  const r = await fetch(`${apiRoot()}/api/admin/heart-packages`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "โหลดแพ็กเกจไม่สำเร็จ");
  return data;
}

export async function apiAdminCreateHeartPackage(token, body) {
  const r = await fetch(`${apiRoot()}/api/admin/heart-packages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "สร้างแพ็กเกจไม่สำเร็จ");
  return data;
}

export async function apiAdminPatchHeartPackage(token, id, body) {
  const r = await fetch(
    `${apiRoot()}/api/admin/heart-packages/${encodeURIComponent(id)}`,
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
  if (!r.ok) throw new Error(data.error || "บันทึกแพ็กเกจไม่สำเร็จ");
  return data;
}

export async function apiAdminPendingHeartPurchases(token) {
  const r = await fetch(`${apiRoot()}/api/admin/heart-purchases/pending`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "โหลดคำขอไม่สำเร็จ");
  return data;
}

export async function apiAdminApproveHeartPurchase(token, id, note) {
  const r = await fetch(
    `${apiRoot()}/api/admin/heart-purchases/${encodeURIComponent(id)}/approve`,
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

export async function apiAdminRejectHeartPurchase(token, id, note) {
  const r = await fetch(
    `${apiRoot()}/api/admin/heart-purchases/${encodeURIComponent(id)}/reject`,
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
