import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { getApiBase } from "../../../../lib/config";

export async function POST() {
  const secret = process.env.LINE_LINK_SECRET;
  if (!secret || String(secret).length < 16) {
    return NextResponse.json(
      { ok: false, error: "เว็บยังไม่ตั้ง LINE_LINK_SECRET — ตั้งบน Render (web + API ให้ค่าเดียวกัน)" },
      { status: 503 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.provider !== "line") {
    return NextResponse.json(
      { ok: false, error: "ยังไม่ได้เข้าสู่ระบบด้วย LINE" },
      { status: 401 }
    );
  }

  const apiBase = getApiBase().replace(/\/$/, "");
  const body = {
    lineUserId: session.user.id,
    displayName: session.user.name || "สมาชิก LINE",
    pictureUrl: session.user.image || null
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
