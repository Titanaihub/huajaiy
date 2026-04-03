import { NextResponse } from "next/server";
import { getApiBase } from "../../../../lib/config";

/** โหลดจากหน้า /login (iframe) same-origin — ส่งต่อไป API หลัก */
export const dynamic = "force-dynamic";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "รูปแบบคำขอไม่ถูกต้อง" },
      { status: 400 }
    );
  }
  const base = getApiBase().replace(/\/$/, "");
  const r = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await r.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json(
      { ok: false, error: text.slice(0, 200) || "เซิร์ฟเวอร์ตอบไม่ถูกต้อง" },
      { status: 502 }
    );
  }
  return NextResponse.json(data, { status: r.status });
}
