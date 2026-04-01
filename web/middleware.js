import { NextResponse } from "next/server";

/** ให้ root layout รู้ path ปัจจุบันเพื่อเลือกพื้นหลัง (หน้าแรก vs หน้าอื่น) */
export function middleware(request) {
  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();
  /** ให้ตรง NEXTAUTH_URL / Callback LINE ที่มักลงทะเบียนเป็น www — คุกกี้เซสชันไม่ข้าม apex ↔ www */
  if (host === "huajaiy.com") {
    const url = request.nextUrl.clone();
    url.hostname = "www.huajaiy.com";
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  const pathname = request.nextUrl.pathname;
  /** NextAuth เคยใช้ pages.signIn = /auth — ส่งต่อทันที (เก็บ query) ก่อนโหลดหน้าเก่า */
  if (pathname === "/auth") {
    const url = request.nextUrl.clone();
    url.pathname = "/login/line";
    return NextResponse.redirect(url);
  }
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
