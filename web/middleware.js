import { NextResponse } from "next/server";

/** ให้ root layout รู้ path ปัจจุบันเพื่อเลือกพื้นหลัง (หน้าแรก vs หน้าอื่น) */
export function middleware(request) {
  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-huajaiy-pathname", pathname);
  return NextResponse.next({
    request: { headers: requestHeaders }
  });
}

/* ต้องมี "/" ชัดเช่นกัน — บางเวอร์ชัน Next pattern ด้านล่างไม่จับ path หน้าแรก ทำให้ไม่ส่ง header → layout ใช้ธีม inner ทั้งเว็บ */
export const config = {
  matcher: [
    "/",
    "/((?!_next/static|_next/image|favicon.ico).*)"
  ]
};
