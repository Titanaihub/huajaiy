import { headers } from "next/headers";

/**
 * pathname จาก middleware
 * ถ้าไม่มี header ให้ถือว่าไม่ใช่หน้าแรก (ใช้ธีม inner) — ลดโอกาสโชว์พื้นหลังหน้าแรกผิดบนหน้าอื่น
 */
export async function getPathnameForLayout() {
  try {
    const h = await headers();
    const raw = h.get("x-huajaiy-pathname");
    if (raw && typeof raw === "string" && raw.length > 0) {
      const path = raw.split("?")[0] || "/";
      return path.startsWith("/") ? path : `/${path}`;
    }
  } catch {
    /* ignore */
  }
  return "/__missing_pathname_header";
}
