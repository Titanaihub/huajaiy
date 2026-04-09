export function getApiBase() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.huajaiy.com"
  );
}

/**
 * ฐาน URL สำหรับ `fetch` จากเบราว์เซอร์: ค่าว่าง = same-origin (`/api/...`) ให้ Next.js rewrites
 * ไปยัง API — ไม่พึ่ง CORS ข้ามโดเมน · บนเซิร์ฟเวอร์ (SSR) ใช้ `getApiBase()` เต็ม
 */
export function getApiOriginForFetch() {
  if (typeof window !== "undefined") return "";
  return getApiBase().replace(/\/$/, "");
}

/**
 * Game API เรียกจากเบราว์เซอร์แบบ same-origin `/api/game/*`
 * Next.js จะ rewrite ไปยัง `NEXT_PUBLIC_API_BASE_URL` (ลดปัญหา CORS)
 */
export function gameApiUrl(path) {
  const p = String(path || "").replace(/^\/+/, "");
  return `/api/game/${p}`;
}

/**
 * อัปโหลดรูป (Cloudinary ผ่าน API) — เรียก same-origin เพื่อให้ next.config rewrites
 * ไป `NEXT_PUBLIC_API_BASE_URL/upload` (ลด CORS / ใช้กับ API ในเครื่องได้เหมือน `/api/game/*`)
 */
export function uploadUrl() {
  return "/upload";
}

/** ลิงก์เพิ่มเพื่อน LINE OA — ตั้ง NEXT_PUBLIC_LINE_ADD_FRIEND_URL (เช่น https://line.me/R/ti/p/@xxxx) */
export function getPublicLineAddFriendUrl() {
  const raw = process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL;
  if (raw == null || String(raw).trim() === "") return "";
  const s = String(raw).trim();
  if (!/^https:\/\//i.test(s)) return "";
  return s;
}

export function getPublicLineOaFriendBonusPink() {
  const n = Math.floor(Number(process.env.NEXT_PUBLIC_LINE_OA_FRIEND_BONUS_PINK) || 5);
  return Math.max(1, Math.min(100, n));
}
