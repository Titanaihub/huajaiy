"use client";

import { useState } from "react";
import { getApiBase } from "../lib/config";

export default function UploadForm() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultUrl, setResultUrl] = useState("");

  const API_BASE = getApiBase();

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
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">อัปโหลดรูป</h2>
      <p className="mt-1 text-sm text-slate-600">
        บีบอัดรูปอัตโนมัติก่อนอัปโหลด — ไม่ต้องล็อกอิน
      </p>

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
  );
}
