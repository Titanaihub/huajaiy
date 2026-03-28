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
      <p className="mt-3 text-xs text-slate-500" role="status">
        กำลังเช็กการเชื่อมต่อ API…
      </p>
    );
  }
  if (state === "up") {
    return (
      <p className="mt-3 text-xs text-brand-800" role="status">
        เชื่อมต่อ API ได้ปกติ
      </p>
    );
  }
  return (
    <p className="mt-3 text-xs text-amber-800" role="alert">
      ยังเชื่อมต่อ API ไม่ได้ — ตรวจ{" "}
      <code className="rounded bg-amber-100/80 px-1">NEXT_PUBLIC_API_BASE_URL</code>{" "}
      บน Render แล้ว Clear build cache & deploy
    </p>
  );
}
