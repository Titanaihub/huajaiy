"use client";

import { useEffect, useState } from "react";
import { gameApiUrl } from "../lib/config";

/**
 * แสดงสถานะจริงจาก /api/game/meta (ผ่าน rewrite ของ Next) — ช่วยแยกว่า
 * "เผยแพร่แล้วแต่หน้าเกมไม่ขึ้น" เกิดจาก API ไม่มีเกม active, หัวใจ, หรือ URL API ผิด
 */
export default function GameApiLiveStatus() {
  const [text, setText] = useState("กำลังตรวจสอบ API เกม…");
  const [tone, setTone] = useState("slate");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(gameApiUrl("meta"), { cache: "no-store" });
        const d = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (!r.ok || !d.ok) {
          setTone("amber");
          setText(
            `API ตอบไม่ปกติ (HTTP ${r.status}) — ตรวจว่าเว็บชี้ API ถูก (NEXT_PUBLIC_API_BASE_URL) และบริการ API รันอยู่`
          );
          return;
        }
        if (d.gameMode === "central") {
          setTone("emerald");
          const title = String(d.title || "").trim() || "—";
          const n = d.cardCount != null ? String(d.cardCount) : "—";
          setText(
            `เซิร์ฟเวอร์พร้อมเกมส่วนกลาง「${title}」 · ${n} ป้าย — ถ้ายังเห็นโหมดสาธิต: ล็อกอินแล้วเช็กยอดรวมชมพู+แดง ≥ ค่าใช้รอบ หรือตั้งหักหัวใจเป็น 0 เพื่อทดสอบ`
          );
        } else {
          setTone("amber");
          setText(
            "เซิร์ฟเวอร์ยังไม่มีเกมส่วนกลางที่เปิดใช้ — ไปแอดมิน → เกมส่วนกลาง → เลือกเกม → กด「เผยแพร่บนเว็บ」(ต้องอัปโหลดรูปครบและมีกติการางวัล)"
          );
        }
      } catch {
        if (!cancelled) {
          setTone("amber");
          setText(
            "เรียก /api/game/meta ไม่ได้ — ตรวจการ deploy เว็บ (rewrite) และว่า API ใช้ DATABASE_URL เดียวกับที่แอดมินบันทึกเกม"
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const border =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50/90 text-emerald-950"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50/90 text-amber-950"
        : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <p
      className={`mt-3 rounded-lg border px-3 py-2 text-xs leading-snug ${border}`}
      role="status"
      aria-live="polite"
    >
      {text}
    </p>
  );
}
