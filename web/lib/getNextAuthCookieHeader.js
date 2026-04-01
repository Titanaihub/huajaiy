import { cookies } from "next/headers";

/** สร้าง header Cookie สำหรับ getToken / อ่านเซสชันใน Route Handler */
export function getNextAuthCookieHeader() {
  try {
    const store = cookies();
    return store
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
  } catch {
    return "";
  }
}
