export function getApiBase() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.huajaiy.com"
  );
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
