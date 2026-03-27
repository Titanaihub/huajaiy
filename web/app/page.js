"use client";

import { useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.huajaiy.com";

export default function HomePage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultUrl, setResultUrl] = useState("");

  async function onUpload() {
    if (!file) {
      setError("กรุณาเลือกรูปก่อน");
      return;
    }

    setLoading(true);
    setError("");
    setResultUrl("");

    try {
      const body = new FormData();
      body.append("image", file);

      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "อัปโหลดไม่สำเร็จ");
      }

      setResultUrl(data.publicUrl);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 py-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-lg font-semibold">อัปโหลดรูป HUAJAIY</h1>
        <p className="mt-1 text-sm text-slate-600">
          หน้าเบา โหลดไว สำหรับ LINE และ Facebook
        </p>

        <div className="mt-4 space-y-3">
          <input
            className="block w-full rounded-xl border border-slate-300 p-3 text-sm"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            type="button"
            onClick={onUpload}
            disabled={loading}
          >
            {loading ? "กำลังอัปโหลด..." : "อัปโหลด"}
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        {resultUrl ? (
          <div className="mt-4 space-y-2">
            <img
              src={resultUrl}
              alt="uploaded"
              className="w-full rounded-xl border border-slate-200"
            />
            <a
              href={resultUrl}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sm text-blue-600 underline"
            >
              {resultUrl}
            </a>
          </div>
        ) : null}
      </section>
    </main>
  );
}
