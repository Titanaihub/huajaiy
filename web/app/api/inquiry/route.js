import { NextResponse } from "next/server";

const MAX_LEN = 2000;

function trimStr(v) {
  if (v == null) return "";
  return String(v).trim().slice(0, MAX_LEN);
}

/**
 * รับข้อความจากฟอร์มบนเว็บ — บันทึกใน log ของเซิร์ฟเวอร์ (ดูได้ใน Render / hosting)
 * ต่อ email / LINE Notify / DB ภายหลัง
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const message = trimStr(body.message);
    if (message.length < 3) {
      return NextResponse.json(
        { ok: false, error: "กรุณากรอกข้อความอย่างน้อย 3 ตัวอักษร" },
        { status: 400 }
      );
    }

    const name = trimStr(body.name).slice(0, 120);
    const email = trimStr(body.email).slice(0, 256);
    const topic = trimStr(body.topic).slice(0, 80);

    const entry = {
      at: new Date().toISOString(),
      topic: topic || "(ไม่ระบุ)",
      name: name || "(ไม่ระบุ)",
      email: email || "(ไม่ระบุ)",
      message
    };

    console.log("[HUAJAIY inquiry]", JSON.stringify(entry));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "รูปแบบไม่ถูกต้อง" },
      { status: 400 }
    );
  }
}
