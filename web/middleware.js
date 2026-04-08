import { NextResponse } from "next/server";
import { isPathAllowed } from "./lib/routeAllowlist";

const MEMBER_GAME_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** ต้องเป็น NEXT_PUBLIC_* เพื่อให้ Edge middleware อ่านค่าได้ตอน build (Render ตั้งก่อน build) */
const STRICT_ROUTES =
  process.env.NEXT_PUBLIC_HUAJAIY_STRICT_ROUTES === "1";

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

  let pathname = request.nextUrl.pathname;
  /** เช่น /member//create-game → /member/create-game (slash ซ้ำจากลิงก์ผิดหรือ paste) */
  const collapsedPath = pathname.replace(/\/+/g, "/");
  if (collapsedPath !== pathname) {
    const url = request.nextUrl.clone();
    url.pathname = collapsedPath;
    return NextResponse.redirect(url, 308);
  }
  pathname = collapsedPath;

  /** /member/shops/{uuid}/products → หน้าจัดการสินค้า React (ลิงก์จากเทมเพลตสมาชิก) */
  const shopProductsMatch = pathname.match(
    /^\/member\/shops\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/products\/?$/i
  );
  if (shopProductsMatch) {
    const url = request.nextUrl.clone();
    url.pathname = `/account/shops/${shopProductsMatch[1]}/products`;
    return NextResponse.redirect(url, 308);
  }

  /** ลิงก์โปรไฟล์สมาชิกใช้ /member — ส่งต่อจาก /account/heart-history (ยกเว้น giveaway) */
  if (
    pathname === "/account/heart-history" ||
    pathname.startsWith("/account/heart-history/")
  ) {
    const isGiveaway =
      pathname === "/account/heart-history/giveaway" ||
      pathname.startsWith("/account/heart-history/giveaway/");
    if (!isGiveaway) {
      const url = request.nextUrl.clone();
      if (
        pathname === "/account/heart-history/play" ||
        pathname.startsWith("/account/heart-history/play/")
      ) {
        url.pathname = "/member/pink-history";
      } else if (
        pathname === "/account/heart-history/purchases" ||
        pathname.startsWith("/account/heart-history/purchases/")
      ) {
        url.pathname = "/member/hearts";
      } else {
        url.pathname = "/member/pink-history";
      }
      return NextResponse.redirect(url, 308);
    }
  }

  if (
    pathname === "/account/prize-payouts" ||
    pathname.startsWith("/account/prize-payouts/")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/account\/prize-payouts/, "/member/prizes");
    return NextResponse.redirect(url, 308);
  }

  if (
    pathname === "/account/profile/legacy" ||
    pathname.startsWith("/account/profile/legacy/")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/account\/profile\/legacy/, "/member");
    return NextResponse.redirect(url, 308);
  }

  /**
   * คง /account เฉพาะหน้าจัดการสินค้า React + giveaway — ที่เหลือส่งไป /member
   */
  const stayOnLegacyAccount =
    pathname === "/account/heart-history/giveaway" ||
    pathname.startsWith("/account/heart-history/giveaway/") ||
    pathname.startsWith("/account/shops/") ||
    pathname === "/account/prize-withdraw" ||
    pathname.startsWith("/account/prize-withdraw/");

  /** ลิงก์เก่า /account → เทมเพลต /member (ยกเว้นหน้าที่ต้องคง React ด้านบน) */
  if (
    !stayOnLegacyAccount &&
    (pathname === "/account" || pathname.startsWith("/account/"))
  ) {
    const url = request.nextUrl.clone();
    let nextPath;
    if (pathname === "/account") {
      nextPath = "/member";
    } else if (pathname.startsWith("/account/creator-withdrawals")) {
      nextPath = pathname.replace(
        /^\/account\/creator-withdrawals/,
        "/member/prize-withdraw"
      );
    } else if (pathname.startsWith("/account/hearts-shop")) {
      nextPath = pathname.replace(
        /^\/account\/hearts-shop/,
        "/member/hearts-top-up"
      );
    } else if (pathname.startsWith("/account/my-hearts")) {
      nextPath = pathname.replace(/^\/account\/my-hearts/, "/member/hearts");
    } else if (pathname.startsWith("/account/my-games")) {
      nextPath = pathname.replace(/^\/account\/my-games/, "/member/game");
    } else {
      nextPath = pathname.replace(/^\/account/, "/member");
    }
    url.pathname = nextPath;
    return NextResponse.redirect(url, 308);
  }

  /** ตั้งค่าเกม = หน้า /member/game-studio — ลิงก์เก่า ?game= บน create-game ส่งต่อมาที่นี่ */
  if (pathname === "/member/create-game") {
    const gameQ = request.nextUrl.searchParams.get("game");
    if (gameQ && MEMBER_GAME_UUID_RE.test(String(gameQ).trim())) {
      const url = request.nextUrl.clone();
      url.pathname = "/member/game-studio";
      return NextResponse.redirect(url, 308);
    }
  }

  /** NextAuth เคยใช้ pages.signIn = /auth — ส่งต่อทันที (เก็บ query) ก่อนโหลดหน้าเก่า */
  if (pathname === "/auth") {
    const url = request.nextUrl.clone();
    url.pathname = "/login/line";
    return NextResponse.redirect(url);
  }

  if (STRICT_ROUTES && !isPathAllowed(pathname)) {
    return new NextResponse(null, { status: 404, statusText: "Not Found" });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-huajaiy-pathname", pathname);
  /** ฝังในสมาชิก TailAdmin — ไม่ครอบ SiteHeader / หลังบ้านเก่า */
  if (
    (pathname === "/account/create-game" ||
      pathname === "/account/game-studio") &&
    request.nextUrl.searchParams.get("member_embed") === "1"
  ) {
    requestHeaders.set("x-huajaiy-account-minimal-shell", "1");
  }
  return NextResponse.next({
    request: { headers: requestHeaders }
  });
}

/* จับทุก path รวมหน้าแรก — ยกเว้น api / upload (rewrite ไปแบ็กเอนด์) + static / favicon */
export const config = {
  matcher: [
    "/",
    "/((?!(?:api|upload)(?:/|$)|_next/static|_next/image|favicon.ico).*)"
  ]
};
