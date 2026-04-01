import { headers } from "next/headers";
import { normalizePathnameForTheme } from "./pathnameNormalize";

/**
 * pathname จาก middleware (ทุกคำขอหน้าเว็บควรมีหลัง deploy middleware ที่ matcher รวม "/")
 * ถ้าไม่มี header ให้ fallback `/` = ธีมหน้าแรก — ปลอดภัยกว่าเดิมที่ fallback เป็น inner แล้วทำให้หน้าแรกเหมือนหน้าอื่น
 */
export async function getPathnameForLayout() {
  try {
    const h = await headers();
    const raw = h.get("x-huajaiy-pathname");
    if (raw && typeof raw === "string" && raw.length > 0) {
      return normalizePathnameForTheme(raw);
    }
  } catch {
    /* ignore */
  }
  return "/";
}
