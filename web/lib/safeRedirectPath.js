/** ใช้หลังล็อกอิน — อนุญาตเฉพาะ path ภายในเว็บ (กัน open redirect) */
export function safeRedirectPath(raw) {
  if (raw == null || typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s.startsWith("/") || s.startsWith("//")) return null;
  if (s.includes("://")) return null;
  return s;
}
