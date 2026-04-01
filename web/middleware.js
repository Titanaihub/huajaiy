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

/* จับทุก path รวมหน้าแรก — ยกเว้น static / image / favicon / api (ไม่ต้องแนบ header ให้คำขอ API) */
export const config = {
  matcher: ["/", "/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
