import { NextResponse } from "next/server";

/**
 * บางที่ตั้ง LINE ใส่ Callback เป็น /auth/line/callback — ส่งต่อ query ไป NextAuth จริง
 * ถ้าใช้ path นี้ ต้องตั้ง LINE_OAUTH_REDIRECT_URI ให้ตรง (ดู web/.env.example)
 */
export function GET(request) {
  const q = request.nextUrl.search;
  const dest = new URL(`/api/auth/callback/line${q}`, request.nextUrl.origin);
  return NextResponse.redirect(dest);
}
