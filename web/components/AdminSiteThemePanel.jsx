"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiBase } from "../lib/config";
import { getMemberToken } from "../lib/memberApi";
import { apiAdminGetSiteTheme, apiAdminPatchSiteTheme } from "../lib/rolesApi";
import { buildSiteFooterBackgroundStyle, buildSiteRootBackgroundStyle } from "../lib/siteThemeStyle";

function loadImage(fileBlob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(fileBlob);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => reject(new Error("อ่านรูปไม่ได้"));
    img.src = objectUrl;
  });
}

const JPEG_FLAT_BG = "#f8fafc";

async function compressToJpeg(file) {
  const img = await loadImage(file);
  const maxSide = 1920;
  const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = JPEG_FLAT_BG;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("บีบอัดไม่สำเร็จ"))),
      "image/jpeg",
      0.85
    );
  });
}

function isProbablyPng(file) {
  return (
    (file.type && String(file.type).toLowerCase() === "image/png") ||
    /\.png$/i.test(file.name || "")
  );
}

async function uploadImageFile(file) {
  const API_BASE = getApiBase().replace(/\/$/, "");
  const body = new FormData();
  if (isProbablyPng(file)) {
    body.append(
      "image",
      file,
      file.name && /\.png$/i.test(file.name) ? file.name : `upload-${Date.now()}.png`
    );
  } else {
    const blob = await compressToJpeg(file);
    body.append("image", new File([blob], `${Date.now()}.jpg`, { type: "image/jpeg" }));
  }
  const res = await fetch(`${API_BASE}/upload`, { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || "อัปโหลดไม่สำเร็จ");
  return data.publicUrl;
}

export default function AdminSiteThemePanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("");
  const [bgGradientTop, setBgGradientTop] = useState("#FFF5F8");
  const [bgGradientMid, setBgGradientMid] = useState("#FFEEF3");
  const [bgGradientBottom, setBgGradientBottom] = useState("#FFD6E2");
  const [imageOverlayPercent, setImageOverlayPercent] = useState(78);
  const [footerScrimHex, setFooterScrimHex] = useState("#2B121C");
  const [footerScrimPercent, setFooterScrimPercent] = useState(48);

  const previewStyle = useMemo(
    () =>
      buildSiteRootBackgroundStyle({
        backgroundImageUrl,
        bgGradientTop,
        bgGradientMid,
        bgGradientBottom,
        imageOverlayPercent
      }),
    [backgroundImageUrl, bgGradientTop, bgGradientMid, bgGradientBottom, imageOverlayPercent]
  );

  const previewFooterStyle = useMemo(
    () =>
      buildSiteFooterBackgroundStyle({
        backgroundImageUrl,
        bgGradientTop,
        bgGradientMid,
        bgGradientBottom,
        footerScrimHex,
        footerScrimPercent
      }),
    [
      backgroundImageUrl,
      bgGradientTop,
      bgGradientMid,
      bgGradientBottom,
      footerScrimHex,
      footerScrimPercent
    ]
  );

  const load = useCallback(async () => {
    const token = getMemberToken();
    if (!token) {
      setErr("ต้องล็อกอินแอดมิน");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const data = await apiAdminGetSiteTheme(token);
      const t = data.theme || {};
      setBackgroundImageUrl(String(t.backgroundImageUrl || ""));
      setBgGradientTop(String(t.bgGradientTop || "#FFF5F8"));
      setBgGradientMid(String(t.bgGradientMid || "#FFEEF3"));
      setBgGradientBottom(String(t.bgGradientBottom || "#FFD6E2"));
      {
        const n = Number(t.imageOverlayPercent);
        setImageOverlayPercent(Number.isFinite(n) ? Math.min(100, Math.max(0, Math.floor(n))) : 78);
      }
      setFooterScrimHex(
        /^#[0-9A-Fa-f]{6}$/.test(String(t.footerScrimHex || "").trim())
          ? String(t.footerScrimHex).trim()
          : "#2B121C"
      );
      {
        const n = Number(t.footerScrimPercent);
        setFooterScrimPercent(Number.isFinite(n) ? Math.min(100, Math.max(0, Math.floor(n))) : 48);
      }
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e) {
    e.preventDefault();
    const token = getMemberToken();
    if (!token) return;
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      await apiAdminPatchSiteTheme(token, {
        backgroundImageUrl,
        bgGradientTop,
        bgGradientMid,
        bgGradientBottom,
        imageOverlayPercent,
        footerScrimHex,
        footerScrimPercent
      });
      router.refresh();
      setMsg("บันทึกแล้ว — หน้าเว็บโหลดธีมใหม่แล้ว (ถ้ายังไม่เห็นรูป ลองลดความทึบทับรูปลง)");
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onPickFile(ev) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    setUploadBusy(true);
    setErr("");
    try {
      const url = await uploadImageFile(file);
      setBackgroundImageUrl(url);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setUploadBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-hui-muted">กำลังโหลดธีม…</p>;
  }

  return (
    <form onSubmit={handleSave} className="max-w-xl space-y-4">
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {msg ? <p className="text-sm text-green-800">{msg}</p> : null}

      <div>
        <p className="hui-label">ตัวอย่างพื้นหลัง</p>
        <div
          className="mt-2 h-28 w-full max-w-md rounded-2xl border border-hui-border shadow-inner"
          style={previewStyle}
          aria-hidden
        />
      </div>

      <div>
        <label htmlFor="site-bg-url" className="hui-label">
          URL รูปพื้นหลัง (https เท่านั้น — เว้นว่าง = ใช้แค่ไล่สี)
        </label>
        <input
          id="site-bg-url"
          type="url"
          value={backgroundImageUrl}
          onChange={(e) => setBackgroundImageUrl(e.target.value)}
          className="hui-input"
          placeholder="https://..."
          autoComplete="off"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <label className="hui-btn-primary inline-flex cursor-pointer items-center justify-center text-sm disabled:opacity-50">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={uploadBusy}
              onChange={onPickFile}
            />
            {uploadBusy ? "กำลังอัปโหลด…" : "อัปโหลดรูป"}
          </label>
          <button
            type="button"
            className="rounded-2xl border border-hui-border bg-white px-4 py-2 text-sm font-semibold text-hui-body hover:bg-hui-surface"
            onClick={() => setBackgroundImageUrl("")}
          >
            ล้าง URL รูป
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="site-bg-top" className="hui-label">
            สีบน (#RRGGBB)
          </label>
          <input
            id="site-bg-top"
            type="text"
            value={bgGradientTop}
            onChange={(e) => setBgGradientTop(e.target.value)}
            className="hui-input font-mono text-sm"
            maxLength={7}
          />
        </div>
        <div>
          <label htmlFor="site-bg-mid" className="hui-label">
            สีกลาง
          </label>
          <input
            id="site-bg-mid"
            type="text"
            value={bgGradientMid}
            onChange={(e) => setBgGradientMid(e.target.value)}
            className="hui-input font-mono text-sm"
            maxLength={7}
          />
        </div>
        <div>
          <label htmlFor="site-bg-bot" className="hui-label">
            สีล่าง
          </label>
          <input
            id="site-bg-bot"
            type="text"
            value={bgGradientBottom}
            onChange={(e) => setBgGradientBottom(e.target.value)}
            className="hui-input font-mono text-sm"
            maxLength={7}
          />
        </div>
      </div>

      <div>
        <label htmlFor="site-bg-overlay" className="hui-label">
          ความทึบเลเยอร์สีทับรูป: {imageOverlayPercent}%
        </label>
        <input
          id="site-bg-overlay"
          type="range"
          min={0}
          max={100}
          value={imageOverlayPercent}
          onChange={(e) => setImageOverlayPercent(Number(e.target.value))}
          className="mt-1 w-full max-w-md"
        />
        <p className="hui-note mt-1">
          ใช้เมื่อมีรูปพื้นหลัง — ยิ่งสูง ตัวหนังสืออ่านง่ายขึ้น · รูปโทนอ่อน/ชมพูให้ลดค่านี้ลงจะเห็นลายชัดขึ้น
        </p>
      </div>

      <div className="rounded-xl border border-hui-border bg-white/60 p-4">
        <p className="hui-label">ฟุตเตอร์ (ด้านล่างเว็บ)</p>
        <p className="hui-note mt-1 mb-3">
          ใช้<strong>รูปพื้นหลังชุดเดียวกับด้านบน</strong> แล้วทับด้วยสีทึบแยกต่างหาก — แนะนำโทนเข้มให้อ่านลิงก์ชัด:{" "}
          <code className="rounded bg-hui-surface px-1">#2B121C</code> burgundy เข้ม (ค่าเริ่ม),{" "}
          <code className="rounded bg-hui-surface px-1">#1a1a1a</code> เทาเข้ม, หรือ{" "}
          <code className="rounded bg-hui-surface px-1">#3d1a24</code> ชมพูเข้ม
        </p>
        <div
          className="mb-4 h-16 w-full max-w-md rounded-xl border border-hui-border"
          style={previewFooterStyle}
          aria-hidden
        />
        <div>
          <label htmlFor="footer-scrim-hex" className="hui-label">
            สีทึบทับรูปในฟุตเตอร์ (#RRGGBB)
          </label>
          <input
            id="footer-scrim-hex"
            type="text"
            value={footerScrimHex}
            onChange={(e) => setFooterScrimHex(e.target.value)}
            className="hui-input max-w-xs font-mono text-sm"
            maxLength={7}
          />
        </div>
        <div className="mt-3">
          <label htmlFor="footer-scrim-pct" className="hui-label">
            ความทึบทับรูปในฟุตเตอร์: {footerScrimPercent}%
          </label>
          <input
            id="footer-scrim-pct"
            type="range"
            min={0}
            max={100}
            value={footerScrimPercent}
            onChange={(e) => setFooterScrimPercent(Number(e.target.value))}
            className="mt-1 w-full max-w-md"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className="hui-btn-primary disabled:opacity-50">
          {saving ? "กำลังบันทึก…" : "บันทึกธีมเว็บ"}
        </button>
        <button
          type="button"
          onClick={() => load()}
          className="rounded-2xl border border-hui-border bg-white px-4 py-2 text-sm font-semibold text-hui-body hover:bg-hui-surface"
        >
          โหลดใหม่
        </button>
      </div>
    </form>
  );
}
