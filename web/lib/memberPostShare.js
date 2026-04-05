/** ลิงก์แชร์ไลน์ (LINE It) */
export function lineShareUrl(pageUrl) {
  return `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(pageUrl)}`;
}

/** ลิงก์แชร์เฟสบุ๊ก */
export function facebookShareUrl(pageUrl) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
}

/**
 * URL หน้าโพสต์เดี่ยวสำหรับแชร์ — ถ้าล็อกอินแล้วแนบ ?ref=username เพื่อนับคลิกตามผู้แชร์
 * @param {string} origin เช่น https://www.huajaiy.com
 * @param {string} pageUsername เจ้าของเพจ
 * @param {string} postId UUID
 * @param {string|null|undefined} viewerUsername สมาชิกที่กำลังแชร์ (ถ้ามี)
 */
export function buildMemberPostShareUrl(origin, pageUsername, postId, viewerUsername) {
  const o = String(origin || "").replace(/\/$/, "");
  const base = `${o}/u/${encodeURIComponent(pageUsername)}/post/${encodeURIComponent(postId)}`;
  const v = viewerUsername && String(viewerUsername).trim();
  if (v) return `${base}?ref=${encodeURIComponent(v)}`;
  return base;
}
