"use client";

import { useEffect, useState } from "react";
import { getApiBase } from "../lib/config";

/** แถบสั้น ๆ บอกว่า API ตอบหรือไม่ — ช่วยเช็กหลังตั้งโดเมน/env */
export default function ApiHealthStrip() {
  const [state, setState] = useState("checking");

  useEffect(() => {
    let cancelled = false;
    const root = getApiBase().replace(/\/$/, "");
    fetch(`${root}/api/health`, { method: "GET", cache: "no-store" })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!cancelled) setState(r.ok && data.ok ? "up" : "down");
      })
      .catch(() => {
        if (!cancelled) setState("down");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "checking") {
    return (
      <p className="mt-3 text-xs text-hui-muted" role="status">
        กำลังเช็กการเชื่อมต่อ API…
      </p>
    );
  }
  if (state === "up") {
    return (
      <p className="mt-3 text-xs text-hui-cta" role="status">
        เชื่อมต่อ API ได้ปกติ
      </p>
    );
  }
  return (
    <p className="mt-3 text-xs text-amber-800" role="alert">
      ยังเชื่อมต่อเซิร์ฟเวอร์ไม่ได้ — ลองรีเฟรชหรือกลับมาใหม่ภายหลัง หากยังไม่หายกรุณาติดต่อผู้ดูแลเว็บไซต์
    </p>
  );
}
