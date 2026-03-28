/** URL หน้าเว็บจริง — ตั้ง NEXT_PUBLIC_SITE_URL บน Render (เช่น https://huajaiy.com) เพื่อ metadata / OG */
export function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw || typeof raw !== "string") return "";
  return raw.replace(/\/$/, "").trim();
}
