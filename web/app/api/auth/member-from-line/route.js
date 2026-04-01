import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { authOptions } from "../../../../lib/auth";
import { getApiBase } from "../../../../lib/config";
import { getNextAuthCookieHeader } from "../../../../lib/getNextAuthCookieHeader";

export async function POST() {
  const secret = process.env.LINE_LINK_SECRET;
  if (!secret || String(secret).length < 16) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "เว็บยังไม่ตั้ง LINE_LINK_SECRET — ตั้งบน Render (web + API ให้ค่าเดียวกัน)"
      },
      { status: 503 }
    );
  }

  const authSecret = authOptions.secret;
  if (!authSecret || String(authSecret).length < 1) {
    return NextResponse.json(
      { ok: false, error: "เซิร์ฟเวอร์ยังไม่ตั้ง NEXTAUTH_SECRET" },
      { status: 503 }
    );
  }

  const cookieHeader = getNextAuthCookieHeader();
  const token = await getToken({
    req: {
      headers: {
        cookie: cookieHeader
      }
    },
    secret: authSecret
  });

  const lineUserId = token?.sub ? String(token.sub) : "";
  const isLine =
    token?.provider === "line" ||
    (lineUserId && /^U[A-Za-z0-9._-]{4,128}$/.test(lineUserId));

  if (!lineUserId || !isLine) {
    return NextResponse.json(
      { ok: false, error: "ยังไม่ได้เข้าสู่ระบบด้วย LINE" },
      { status: 401 }
    );
  }

  const apiBase = getApiBase().replace(/\/$/, "");
  const body = {
    lineUserId,
    displayName: (token.name && String(token.name).trim()) || "สมาชิก LINE",
    pictureUrl: token.picture ? String(token.picture) : null
  };

  const r = await fetch(`${apiBase}/api/auth/login-line`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-HUAJAIY-Line-Link-Secret": secret
    },
    body: JSON.stringify(body)
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    const status = r.status === 403 ? 403 : r.status === 503 ? 503 : 502;
    return NextResponse.json(
      { ok: false, error: data.error || "แลกโทเค็นสมาชิกไม่สำเร็จ" },
      { status }
    );
  }

  return NextResponse.json(data);
}
