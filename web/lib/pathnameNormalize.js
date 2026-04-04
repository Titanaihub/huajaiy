/** ทำให้ path ปกติใช้กติกาเดียวกัน — ใช้ได้ทั้ง server/client */
export function normalizePathnameForTheme(raw) {
  let p = String(raw ?? "/").split("?")[0].split("#")[0].trim() || "/";
  if (!p.startsWith("/")) p = `/${p}`;
  while (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}
