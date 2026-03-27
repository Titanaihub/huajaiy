"use client";

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.huajaiy.com";

export default function HomePage() {
  const { data: session, status } = useSession();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultUrl, setResultUrl] = useState("");

  function loadImage(fileBlob) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(fileBlob);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      img.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์รูปได้"));
      img.src = objectUrl;
    });
  }

  async function compressImage(originalFile) {
    // ลดขนาดรูปฝั่ง client เพื่อให้อัปโหลดไวขึ้นใน in-app browser
    const img = await loadImage(originalFile);
    const maxSide = 1600;
    const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1);
    const width = Math.round(img.width * ratio);
    const height = Math.round(img.height * ratio);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("บีบอัดรูปไม่สำเร็จ"));
          resolve(blob);
        },
        "image/jpeg",
        0.82
      );
    });
  }

  async function onUpload() {
    if (status !== "authenticated") {
      setError("กรุณาเข้าสู่ระบบด้วย LINE / Facebook ก่อน");
      return;
    }
    if (!file) {
      setError("กรุณาเลือกรูปก่อน");
      return;
    }

    setLoading(true);
    setError("");
    setResultUrl("");

    try {
      const body = new FormData();
      const compressed = await compressImage(file);
      const uploadFile = new File([compressed], `${Date.now()}.jpg`, {
        type: "image/jpeg"
      });
      body.append("image", uploadFile);

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

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-700">เข้าสู่ระบบ</p>
          <p className="mt-1 text-xs text-slate-500">
            ครั้งแรกต้องกดยอมรับสิทธิ์ต่อแพลตฟอร์ม ครั้งถัดไปจะจำเซสชันให้
            (ไม่มี “ล็อกอินเอง” โดยไม่ยุ่งกับ LINE/FB)
          </p>
          {status === "loading" ? (
            <p className="mt-2 text-xs text-slate-500">กำลังตรวจสอบเซสชัน...</p>
          ) : null}
          {status === "authenticated" && session?.user ? (
            <div className="mt-3 flex items-center gap-3">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt=""
                  className="h-10 w-10 rounded-full border border-slate-200"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {session.user.name || "ผู้ใช้"}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {session.provider || "บัญชีที่เชื่อมแล้ว"}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700"
                onClick={() => signOut()}
              >
                ออก
              </button>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                className="rounded-xl bg-[#1877F2] px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
                onClick={() => signIn("facebook")}
                disabled={status === "loading"}
              >
                Facebook
              </button>
              <button
                type="button"
                className="rounded-xl bg-[#06C755] px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
                onClick={() => signIn("line")}
                disabled={status === "loading"}
              >
                LINE
              </button>
              <button
                type="button"
                className="col-span-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-400"
                disabled
                title="TikTok Login Kit ต้องตั้งค่า OAuth แยกตามเอกสาร TikTok — จะเพิ่มในรอบถัดไป"
              >
                TikTok (เร็วๆ นี้)
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-3">
          <input
            className="block w-full rounded-xl border border-slate-300 p-3 text-sm"
            type="file"
            accept="image/*"
            capture="environment"
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
        <p className="mt-2 text-xs text-slate-500">
          ระบบจะบีบอัดรูปอัตโนมัติก่อนอัปโหลด เพื่อให้โหลดเร็วบนมือถือ
        </p>

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
