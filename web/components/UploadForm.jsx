"use client";

import { useState } from "react";
import { getApiBase, uploadUrl } from "../lib/config";

export default function UploadForm({ showCardHeader = true }) {
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

      const res = await fetch(uploadUrl(), {
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
    <section
      id="upload"
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-hui-border bg-hui-surface shadow-soft"
    >
      {showCardHeader ? (
        <div className="border-b border-hui-border bg-gradient-to-r from-hui-pageTop to-white px-6 py-4 md:px-8">
          <h2 className="hui-h2">อัปโหลดรูป</h2>
          <p className="mt-1 text-sm text-hui-muted">
            บีบอัดรูปอัตโนมัติก่อนส่ง — ไม่ต้องล็อกอิน
          </p>
        </div>
      ) : null}

      <div className={`p-6 md:p-8 ${showCardHeader ? "" : "pt-8"}`}>
        <label
          htmlFor="upload-file"
          className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-hui-border bg-hui-pageTop/70 px-4 py-12 transition hover:border-hui-cta/40 hover:bg-white"
        >
          <span className="rounded-full bg-white p-3 shadow-sm ring-1 ring-hui-border">
            <svg
              className="h-8 w-8 text-hui-cta"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
          </span>
          <span className="mt-4 text-center text-sm font-medium text-hui-body">
            แตะเพื่อเลือกไฟล์ หรือถ่ายรูป
          </span>
          <span className="mt-1 text-center text-sm text-hui-muted">
            รองรับ JPG, PNG, HEIC ผ่านเบราว์เซอร์
          </span>
          {file ? (
            <span className="mt-3 max-w-full truncate text-sm font-medium text-hui-cta">
              {file.name}
            </span>
          ) : null}
          <input
            id="upload-file"
            className="sr-only"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>

        <button
          className="hui-btn-primary mt-6 w-full px-4 py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={onUpload}
          disabled={loading}
        >
          {loading ? "กำลังอัปโหลด…" : "อัปโหลดไปยังคลาวด์"}
        </button>

        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
            {error}
          </p>
        ) : null}

        {resultUrl ? (
          <div className="mt-6 space-y-3 rounded-2xl border border-hui-border bg-hui-pageTop/60 p-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-hui-muted">
              อัปโหลดสำเร็จ
            </p>
            <img
              src={resultUrl}
              alt="รูปที่อัปโหลด"
              className="w-full rounded-xl border border-hui-border shadow-sm"
            />
            <a
              href={resultUrl}
              target="_blank"
              rel="noreferrer"
              className="block break-all text-sm font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
            >
              {resultUrl}
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
