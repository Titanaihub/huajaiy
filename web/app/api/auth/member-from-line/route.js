import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { authOptions } from "../../../../lib/auth";
import { getApiBase } from "../../../../lib/config";

/**
 * NextAuth getToken อ่านเฉพาะ req.cookies (ต้องเป็น RequestCookies ที่มี getAll) — ไม่อ่านแค่ headers.cookie
 * โค้ดเดิมประกอบ string Cookie ส่งใน headers ทำให้ SessionStore ว่าง → getToken เป็น null ตลอด
 */
export const dynamic = "force-dynamic";

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

  const token = await getToken({
    req: { cookies: cookies() },
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

  const raw = await r.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {
      error: raw
        ? raw.slice(0, 280)
        : `API ตอบ ${r.status} — ตรวจ NEXT_PUBLIC_API_BASE_URL และว่า huajaiy-api ทำงาน`
    };
  }
  if (!r.ok || !data.ok) {
    const status = r.status === 403 ? 403 : r.status === 503 ? 503 : 502;
    const msg =
      data.error ||
      `แลกโทเค็นไม่สำเร็จ (HTTP ${r.status}) — ตรวจ LINE_LINK_SECRET คู่กับ API และ DATABASE_URL`;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }

  return NextResponse.json(data);
}
