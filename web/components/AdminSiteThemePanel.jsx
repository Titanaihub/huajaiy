"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiBase } from "../lib/config";
import { getMemberToken } from "../lib/memberApi";
import { apiAdminGetSiteTheme, apiAdminPatchSiteTheme } from "../lib/rolesApi";
import {
  createDefaultOrganicHomeForm,
  mergeOrganicHomeFromApi,
  ORGANIC_HOMEPAGE_BLOCK_TOGGLES,
  ORGANIC_SECTION_HEADING_SIMPLE_KEYS
} from "../lib/organicHomeFormDefaults";
import { buildSiteFooterOverlayStyle, buildSiteRootBackgroundStyle } from "../lib/siteThemeStyle";
import {
  FALLBACK_GAME_LOBBY_THEME,
  mergeGameLobbyFromApi
} from "../lib/gameLobbyThemeDefaults";

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

function validHex(s, fallback) {
  return /^#[0-9A-Fa-f]{6}$/.test(String(s || "").trim()) ? String(s).trim() : fallback;
}

export default function AdminSiteThemePanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [backgroundImageUrl, setBackgroundImageUrl] = useState("");
  const [bgGradientTop, setBgGradientTop] = useState("#FFF5F8");
  const [bgGradientMid, setBgGradientMid] = useState("#FFEEF3");
  const [bgGradientBottom, setBgGradientBottom] = useState("#FFD6E2");
  const [imageOverlayPercent, setImageOverlayPercent] = useState(78);

  const [innerBackgroundImageUrl, setInnerBackgroundImageUrl] = useState("");
  const [innerBgGradientTop, setInnerBgGradientTop] = useState("#FFF5F8");
  const [innerBgGradientMid, setInnerBgGradientMid] = useState("#FFEEF3");
  const [innerBgGradientBottom, setInnerBgGradientBottom] = useState("#FFD6E2");
  const [innerImageOverlayPercent, setInnerImageOverlayPercent] = useState(78);

  const [footerScrimHex, setFooterScrimHex] = useState("#2B121C");
  const [footerScrimPercent, setFooterScrimPercent] = useState(48);

  const [organicHome, setOrganicHome] = useState(() => createDefaultOrganicHomeForm());

  const [gameLobby, setGameLobby] = useState(() => ({ ...FALLBACK_GAME_LOBBY_THEME }));

  const previewHomeStyle = useMemo(
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

  const previewInnerStyle = useMemo(
    () =>
      buildSiteRootBackgroundStyle({
        backgroundImageUrl: innerBackgroundImageUrl,
        bgGradientTop: innerBgGradientTop,
        bgGradientMid: innerBgGradientMid,
        bgGradientBottom: innerBgGradientBottom,
        imageOverlayPercent: innerImageOverlayPercent
      }),
    [
      innerBackgroundImageUrl,
      innerBgGradientTop,
      innerBgGradientMid,
      innerBgGradientBottom,
      innerImageOverlayPercent
    ]
  );

  const previewFooterOverlayStyle = useMemo(
    () => buildSiteFooterOverlayStyle({ footerScrimHex, footerScrimPercent }),
    [footerScrimHex, footerScrimPercent]
  );

  const previewGameLobbyStyle = useMemo(
    () =>
      buildSiteRootBackgroundStyle({
        backgroundImageUrl: gameLobby.backgroundImageUrl,
        bgGradientTop: gameLobby.bgGradientTop,
        bgGradientMid: gameLobby.bgGradientMid,
        bgGradientBottom: gameLobby.bgGradientBottom,
        imageOverlayPercent: gameLobby.imageOverlayPercent
      }),
    [
      gameLobby.backgroundImageUrl,
      gameLobby.bgGradientTop,
      gameLobby.bgGradientMid,
      gameLobby.bgGradientBottom,
      gameLobby.imageOverlayPercent
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
      setInnerBackgroundImageUrl(String(t.innerBackgroundImageUrl || ""));
      setInnerBgGradientTop(String(t.innerBgGradientTop || "#FFF5F8"));
      setInnerBgGradientMid(String(t.innerBgGradientMid || "#FFEEF3"));
      setInnerBgGradientBottom(String(t.innerBgGradientBottom || "#FFD6E2"));
      {
        const n = Number(t.innerImageOverlayPercent);
        setInnerImageOverlayPercent(Number.isFinite(n) ? Math.min(100, Math.max(0, Math.floor(n))) : 78);
      }
      setFooterScrimHex(validHex(t.footerScrimHex, "#2B121C"));
      {
        const n = Number(t.footerScrimPercent);
        setFooterScrimPercent(Number.isFinite(n) ? Math.min(100, Math.max(0, Math.floor(n))) : 48);
      }
      setOrganicHome(mergeOrganicHomeFromApi(t.organicHome));
      setGameLobby(mergeGameLobbyFromApi(t.gameLobby));
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
        innerBackgroundImageUrl,
        innerBgGradientTop,
        innerBgGradientMid,
        innerBgGradientBottom,
        innerImageOverlayPercent,
        footerScrimHex,
        footerScrimPercent,
        organicHome,
        gameLobby
      });
      router.refresh();
      setMsg("บันทึกแล้ว — สลับหน้าแรกกับหน้าอื่นเพื่อเทียบพื้นหลัง");
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onPickFile(ev, setUrl, zone, slice) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    setUploadBusy(zone);
    setErr("");
    try {
      const url = await uploadImageFile(file);
      setUrl(url);
      const token = getMemberToken();
      if (token) {
        try {
          await apiAdminPatchSiteTheme(
            token,
            slice === "home"
              ? { backgroundImageUrl: url }
              : { innerBackgroundImageUrl: url }
          );
          router.refresh();
        } catch (patchErr) {
          setErr(
            patchErr.message ||
              "อัปโหลดแล้ว แต่บันทึก URL ลงเซิร์ฟเวอร์ไม่สำเร็จ — กด «บันทึกธีมเว็บ»"
          );
        }
      }
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setUploadBusy(null);
    }
  }

  async function onPickOrganicHeroBg(ev) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    setUploadBusy("organicHero");
    setErr("");
    try {
      const url = await uploadImageFile(file);
      const token = getMemberToken();
      const nextOrganic = { ...organicHome, heroBackgroundImageUrl: url };
      setOrganicHome(nextOrganic);
      if (token) {
        try {
          await apiAdminPatchSiteTheme(token, { organicHome: nextOrganic });
          router.refresh();
        } catch (patchErr) {
          setErr(
            patchErr.message ||
              "อัปโหลดแล้ว แต่บันทึก URL ลงเซิร์ฟเวอร์ไม่สำเร็จ — กด «บันทึกธีมเว็บ»"
          );
        }
      }
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setUploadBusy(null);
    }
  }

  async function onPickFeatureIcon(index, ev) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    setUploadBusy(`organicIcon-${index}`);
    setErr("");
    try {
      const url = await uploadImageFile(file);
      const token = getMemberToken();
      const features = organicHome.features.map((f, idx) =>
        idx === index ? { ...f, iconImageUrl: url } : f
      );
      const nextOrganic = { ...organicHome, features };
      setOrganicHome(nextOrganic);
      if (token) {
        try {
          await apiAdminPatchSiteTheme(token, { organicHome: nextOrganic });
          router.refresh();
        } catch (patchErr) {
          setErr(
            patchErr.message ||
              "อัปโหลดแล้ว แต่บันทึก URL ลงเซิร์ฟเวอร์ไม่สำเร็จ — กด «บันทึกธีมเว็บ»"
          );
        }
      }
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setUploadBusy(null);
    }
  }

  async function onPickCommunityPostImage(index, ev) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    setUploadBusy(`organicCommunity-${index}`);
    setErr("");
    try {
      const url = await uploadImageFile(file);
      const token = getMemberToken();
      const merged = mergeOrganicHomeFromApi({ communityPage: organicHome.communityPage })
        .communityPage;
      const posts = merged.posts.map((p, idx) =>
        idx === index ? { ...p, imageUrl: url } : p
      );
      const nextOrganic = { ...organicHome, communityPage: { ...merged, posts } };
      setOrganicHome(nextOrganic);
      if (token) {
        try {
          await apiAdminPatchSiteTheme(token, { organicHome: nextOrganic });
          router.refresh();
        } catch (patchErr) {
          setErr(
            patchErr.message ||
              "อัปโหลดแล้ว แต่บันทึก URL ลงเซิร์ฟเวอร์ไม่สำเร็จ — กด «บันทึกธีมเว็บ»"
          );
        }
      }
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setUploadBusy(null);
    }
  }

  async function onPickGameLobbyBg(ev) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    setUploadBusy("gameLobby");
    setErr("");
    try {
      const url = await uploadImageFile(file);
      const token = getMemberToken();
      const next = { ...gameLobby, backgroundImageUrl: url };
      setGameLobby(next);
      if (token) {
        try {
          await apiAdminPatchSiteTheme(token, { gameLobby: next });
          router.refresh();
        } catch (patchErr) {
          setErr(
            patchErr.message ||
              "อัปโหลดแล้ว แต่บันทึก URL ลงเซิร์ฟเวอร์ไม่สำเร็จ — กด «บันทึกธีมเว็บ»"
          );
        }
      }
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setUploadBusy(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-hui-muted">กำลังโหลดธีม…</p>;
  }

  return (
    <form onSubmit={handleSave} className="max-w-5xl space-y-6">
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {msg ? <p className="text-sm text-green-800">{msg}</p> : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <fieldset className="min-w-0 space-y-4 rounded-xl border border-hui-border bg-white/50 p-4">
          <legend className="px-1 text-base font-semibold text-hui-section">
            หน้าแรก <span className="font-normal text-hui-muted">(/)</span>
          </legend>
          <div>
            <p className="hui-label">ตัวอย่าง</p>
            <div
              className="mt-2 h-24 w-full rounded-2xl border border-hui-border shadow-inner"
              style={previewHomeStyle}
              aria-hidden
            />
          </div>
          <div>
            <label htmlFor="site-bg-url" className="hui-label">
              URL รูป (https — เว้นว่าง = ไล่สีอย่างเดียว)
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
                  disabled={uploadBusy !== null}
                  onChange={(e) => onPickFile(e, setBackgroundImageUrl, "home")}
                />
                {uploadBusy === "home" ? "กำลังอัปโหลด…" : "อัปโหลดรูป"}
              </label>
              <button
                type="button"
                className="rounded-2xl border border-hui-border bg-white px-4 py-2 text-sm font-semibold text-hui-body hover:bg-hui-surface"
                onClick={() => setBackgroundImageUrl("")}
              >
                ล้าง URL
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="site-bg-top" className="hui-label">
                สีบน
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
              ความทึบทับรูป: {imageOverlayPercent}%
            </label>
            <input
              id="site-bg-overlay"
              type="range"
              min={0}
              max={100}
              value={imageOverlayPercent}
              onChange={(e) => setImageOverlayPercent(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </div>
        </fieldset>

        <fieldset className="min-w-0 space-y-4 rounded-xl border border-hui-border bg-white/50 p-4">
          <legend className="px-1 text-base font-semibold text-hui-section">
            หน้าอื่นทั้งหมด <span className="font-normal text-hui-muted">(รวมแอดมิน ล็อกอิน เกม ฯลฯ)</span>
          </legend>
          <div>
            <p className="hui-label">ตัวอย่าง</p>
            <div
              className="mt-2 h-24 w-full rounded-2xl border border-hui-border shadow-inner"
              style={previewInnerStyle}
              aria-hidden
            />
          </div>
          <div>
            <label htmlFor="inner-bg-url" className="hui-label">
              URL รูป (https)
            </label>
            <input
              id="inner-bg-url"
              type="url"
              value={innerBackgroundImageUrl}
              onChange={(e) => setInnerBackgroundImageUrl(e.target.value)}
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
                  disabled={uploadBusy !== null}
                  onChange={(e) => onPickFile(e, setInnerBackgroundImageUrl, "inner", "inner")}
                />
                {uploadBusy === "inner" ? "กำลังอัปโหลด…" : "อัปโหลดรูป"}
              </label>
              <button
                type="button"
                className="rounded-2xl border border-hui-border bg-white px-4 py-2 text-sm font-semibold text-hui-body hover:bg-hui-surface"
                onClick={() => setInnerBackgroundImageUrl("")}
              >
                ล้าง URL
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="inner-bg-top" className="hui-label">
                สีบน
              </label>
              <input
                id="inner-bg-top"
                type="text"
                value={innerBgGradientTop}
                onChange={(e) => setInnerBgGradientTop(e.target.value)}
                className="hui-input font-mono text-sm"
                maxLength={7}
              />
            </div>
            <div>
              <label htmlFor="inner-bg-mid" className="hui-label">
                สีกลาง
              </label>
              <input
                id="inner-bg-mid"
                type="text"
                value={innerBgGradientMid}
                onChange={(e) => setInnerBgGradientMid(e.target.value)}
                className="hui-input font-mono text-sm"
                maxLength={7}
              />
            </div>
            <div>
              <label htmlFor="inner-bg-bot" className="hui-label">
                สีล่าง
              </label>
              <input
                id="inner-bg-bot"
                type="text"
                value={innerBgGradientBottom}
                onChange={(e) => setInnerBgGradientBottom(e.target.value)}
                className="hui-input font-mono text-sm"
                maxLength={7}
              />
            </div>
          </div>
          <div>
            <label htmlFor="inner-bg-overlay" className="hui-label">
              ความทึบทับรูป: {innerImageOverlayPercent}%
            </label>
            <input
              id="inner-bg-overlay"
              type="range"
              min={0}
              max={100}
              value={innerImageOverlayPercent}
              onChange={(e) => setInnerImageOverlayPercent(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </div>
        </fieldset>
      </div>

      <fieldset className="min-w-0 space-y-4 rounded-xl border border-hui-border bg-white/50 p-4">
        <legend className="px-1 text-base font-semibold text-hui-section">
          หน้าเกมและรางวัล <span className="font-normal text-hui-muted">(/game)</span>
        </legend>
        <p className="text-sm text-hui-muted">
          พื้นหลังเฉพาะหน้านี้ (ไล่สีหรือรูป https) · สีหัวเมนู หัวข้อ ช่องค้นหา ข้อความในการ์ด และพื้นการ์ด · บันทึกร่วมกับ «บันทึกธีมเว็บ»
        </p>
        <div>
          <p className="hui-label">ตัวอย่างพื้นหลัง</p>
          <div
            className="mt-2 h-24 w-full rounded-2xl border border-hui-border shadow-inner"
            style={previewGameLobbyStyle}
            aria-hidden
          />
        </div>
        <div>
          <label htmlFor="gl-bg-url" className="hui-label">
            URL รูปพื้นหลัง (https — เว้นว่าง = ไล่สีอย่างเดียว)
          </label>
          <input
            id="gl-bg-url"
            type="url"
            value={gameLobby.backgroundImageUrl}
            onChange={(e) => setGameLobby({ ...gameLobby, backgroundImageUrl: e.target.value })}
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
                disabled={uploadBusy !== null}
                onChange={onPickGameLobbyBg}
              />
              {uploadBusy === "gameLobby" ? "กำลังอัปโหลด…" : "อัปโหลดรูปพื้นหลัง"}
            </label>
            <button
              type="button"
              className="rounded-2xl border border-hui-border bg-white px-4 py-2 text-sm font-semibold text-hui-body hover:bg-hui-surface"
              onClick={() => setGameLobby({ ...gameLobby, backgroundImageUrl: "" })}
            >
              ล้าง URL
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="gl-bg-top" className="hui-label">
              สีไล่บน
            </label>
            <input
              id="gl-bg-top"
              type="text"
              value={gameLobby.bgGradientTop}
              onChange={(e) => setGameLobby({ ...gameLobby, bgGradientTop: e.target.value })}
              className="hui-input font-mono text-sm"
              maxLength={7}
            />
          </div>
          <div>
            <label htmlFor="gl-bg-mid" className="hui-label">
              สีกลาง
            </label>
            <input
              id="gl-bg-mid"
              type="text"
              value={gameLobby.bgGradientMid}
              onChange={(e) => setGameLobby({ ...gameLobby, bgGradientMid: e.target.value })}
              className="hui-input font-mono text-sm"
              maxLength={7}
            />
          </div>
          <div>
            <label htmlFor="gl-bg-bot" className="hui-label">
              สีล่าง
            </label>
            <input
              id="gl-bg-bot"
              type="text"
              value={gameLobby.bgGradientBottom}
              onChange={(e) => setGameLobby({ ...gameLobby, bgGradientBottom: e.target.value })}
              className="hui-input font-mono text-sm"
              maxLength={7}
            />
          </div>
        </div>
        <div>
          <label htmlFor="gl-bg-overlay" className="hui-label">
            ความทึบทับรูป: {gameLobby.imageOverlayPercent}%
          </label>
          <input
            id="gl-bg-overlay"
            type="range"
            min={0}
            max={100}
            value={gameLobby.imageOverlayPercent}
            onChange={(e) =>
              setGameLobby({ ...gameLobby, imageOverlayPercent: Number(e.target.value) })
            }
            className="mt-1 w-full"
          />
        </div>

        <p className="pt-2 text-sm font-semibold text-hui-section">แถบหัวและเมนู</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["headerBackground", "พื้นหลังแถบหัว"],
            ["headerBorder", "เส้นขอบล่างแถบหัว"],
            ["navLinkColor", "ข้อความลิงก์เมนู"],
            ["navLinkHoverColor", "ลิงก์เมนูตอนโฮเวอร์"],
            ["navMutedColor", "ข้อความจาง (เช่น … โหลด)"],
            ["iconButtonColor", "ไอคอนขวา / แฮมเบอร์เกอร์"],
            ["iconButtonHoverBg", "พื้นโฮเวอร์ไอคอน"]
          ].map(([key, label]) => (
            <div key={key}>
              <label htmlFor={`gl-${key}`} className="hui-label">
                {label}
              </label>
              <input
                id={`gl-${key}`}
                type="text"
                value={gameLobby[key]}
                onChange={(e) => setGameLobby({ ...gameLobby, [key]: e.target.value })}
                className="hui-input font-mono text-sm"
                maxLength={7}
              />
            </div>
          ))}
        </div>

        <p className="pt-2 text-sm font-semibold text-hui-section">หัวข้อและช่องค้นหา</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["pageHeadingColor", "หัวข้อ «เกมและรางวัล»"],
            ["searchLabelColor", "ป้ายช่องค้นหา"],
            ["searchInputBackground", "พื้นช่องค้นหา"],
            ["searchInputBorder", "ขอบช่องค้นหา"],
            ["searchInputText", "ตัวอักษรในช่องค้นหา"],
            ["searchPlaceholderColor", "ตัวอย่างในช่อง (placeholder)"]
          ].map(([key, label]) => (
            <div key={key}>
              <label htmlFor={`gl-${key}`} className="hui-label">
                {label}
              </label>
              <input
                id={`gl-${key}`}
                type="text"
                value={gameLobby[key]}
                onChange={(e) => setGameLobby({ ...gameLobby, [key]: e.target.value })}
                className="hui-input font-mono text-sm"
                maxLength={7}
              />
            </div>
          ))}
        </div>

        <p className="pt-2 text-sm font-semibold text-hui-section">การ์ดเกม</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["cardBackground", "พื้นหลังการ์ด"],
            ["cardBorder", "เส้นขอบการ์ด"],
            ["cardMediaBackground", "พื้นหลังกรอบรูปปก"],
            ["cardTitleColor", "ชื่อเกม"],
            ["cardMutedColor", "ข้อความรอง (ผู้สร้าง / ไม่มีคำอธิบาย)"],
            ["cardBodyColor", "คำอธิบาย / @ผู้สร้าง"],
            ["cardHeartColor", "บรรทัดหักหัวใจ"],
            ["cardCtaColor", "ข้อความ «เข้าเล่นเกมนี้»"],
            ["cardCtaHoverColor", "CTA ตอนโฮเวอร์การ์ด"]
          ].map(([key, label]) => (
            <div key={key}>
              <label htmlFor={`gl-${key}`} className="hui-label">
                {label}
              </label>
              <input
                id={`gl-${key}`}
                type="text"
                value={gameLobby[key]}
                onChange={(e) => setGameLobby({ ...gameLobby, [key]: e.target.value })}
                className="hui-input font-mono text-sm"
                maxLength={7}
              />
            </div>
          ))}
        </div>

        <p className="pt-2 text-sm font-semibold text-hui-section">ลิงก์ท้ายหน้า (/game)</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["footerNavColor", "ข้อความลิงก์ (หน้าแรก ร้านค้า …)"],
            ["footerNavHoverColor", "ลิงก์ตอนโฮเวอร์"]
          ].map(([key, label]) => (
            <div key={key}>
              <label htmlFor={`gl-${key}`} className="hui-label">
                {label}
              </label>
              <input
                id={`gl-${key}`}
                type="text"
                value={gameLobby[key]}
                onChange={(e) => setGameLobby({ ...gameLobby, [key]: e.target.value })}
                className="hui-input font-mono text-sm"
                maxLength={7}
              />
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className="min-w-0 space-y-5 rounded-xl border border-hui-border bg-white/50 p-4">
        <legend className="px-1 text-base font-semibold text-hui-section">
          หน้าแรก Organic <span className="font-normal text-hui-muted">(เทมเพลต /organic-template/)</span>
        </legend>
        <p className="hui-note text-sm">
          ควบคุมรูปพื้นหลัง hero (แทนพื้นเหลือง/รูปตะกร้า), ข้อความ, สีข้อความ (#RRGGBB — คำอธิบายการ์ดรองรับ rgba), ปุ่ม CTA, สถิติ 3 คอลัมน์ และการ์ดฟีเจอร์ 3 ใบ · บันทึกร่วมกับปุ่ม «บันทึกธีมเว็บ» ด้านล่าง
        </p>

        <div className="space-y-3 rounded-xl border border-hui-border bg-hui-surface/90 p-4">
          <h3 className="text-sm font-semibold text-hui-section">
            แสดงบล็อกบนหน้าแรก (iframe เทมเพลต)
          </h3>
          <p className="text-xs text-hui-muted">
            เลิกเลือกช่องเพื่อซ่อนแถบนั้นบนเว็บจริง — ไม่กระทบเกมและรางวัล แบนเนอร์โปร จดหมายข่าว และแอป (ฟุตเตอร์เทมเพลตถูกถอดออกจากหน้าแรกแล้ว)
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ORGANIC_HOMEPAGE_BLOCK_TOGGLES.map(({ key, label }) => (
              <label
                key={key}
                className="flex cursor-pointer items-start gap-2.5 text-sm text-hui-body"
              >
                <input
                  type="checkbox"
                  checked={organicHome.sectionVisibility?.[key] !== false}
                  onChange={(e) =>
                    setOrganicHome({
                      ...organicHome,
                      sectionVisibility: {
                        ...organicHome.sectionVisibility,
                        [key]: e.target.checked
                      }
                    })
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-hui-border text-hui-cta focus:ring-hui-cta/30"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="organic-hero-bg-url" className="hui-label">
            Hero — URL รูปพื้นหลัง (https)
          </label>
          <input
            id="organic-hero-bg-url"
            type="url"
            value={organicHome.heroBackgroundImageUrl}
            onChange={(e) =>
              setOrganicHome({ ...organicHome, heroBackgroundImageUrl: e.target.value })
            }
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
                disabled={uploadBusy !== null}
                onChange={onPickOrganicHeroBg}
              />
              {uploadBusy === "organicHero" ? "กำลังอัปโหลด…" : "อัปโหลดรูป Hero"}
            </label>
            <button
              type="button"
              className="rounded-2xl border border-hui-border bg-white px-4 py-2 text-sm font-semibold text-hui-body hover:bg-hui-surface"
              onClick={() => setOrganicHome({ ...organicHome, heroBackgroundImageUrl: "" })}
            >
              ล้าง URL
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="organic-hero-title" className="hui-label">
              หัวข้อหลัก
            </label>
            <input
              id="organic-hero-title"
              type="text"
              value={organicHome.heroTitle}
              onChange={(e) => setOrganicHome({ ...organicHome, heroTitle: e.target.value })}
              className="hui-input"
            />
            <label htmlFor="organic-hero-title-color" className="hui-label mt-2">
              สีหัวข้อ
            </label>
            <input
              id="organic-hero-title-color"
              type="text"
              value={organicHome.heroTitleColor}
              onChange={(e) => setOrganicHome({ ...organicHome, heroTitleColor: e.target.value })}
              className="hui-input font-mono text-sm"
              maxLength={40}
            />
          </div>
          <div>
            <label htmlFor="organic-hero-sub" className="hui-label">
              คำบรรยายใต้หัวข้อ
            </label>
            <textarea
              id="organic-hero-sub"
              rows={2}
              value={organicHome.heroSubtitle}
              onChange={(e) => setOrganicHome({ ...organicHome, heroSubtitle: e.target.value })}
              className="hui-input min-h-[3rem]"
            />
            <label htmlFor="organic-hero-sub-color" className="hui-label mt-2">
              สีคำบรรยาย
            </label>
            <input
              id="organic-hero-sub-color"
              type="text"
              value={organicHome.heroSubtitleColor}
              onChange={(e) => setOrganicHome({ ...organicHome, heroSubtitleColor: e.target.value })}
              className="hui-input font-mono text-sm"
              maxLength={40}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-hui-border bg-white/40 p-3">
            <p className="mb-2 text-sm font-semibold text-hui-section">ปุ่มหลัก (Primary CTA)</p>
            <div className="space-y-2">
              <input
                type="text"
                value={organicHome.primaryCta.label}
                onChange={(e) =>
                  setOrganicHome({
                    ...organicHome,
                    primaryCta: { ...organicHome.primaryCta, label: e.target.value }
                  })
                }
                className="hui-input text-sm"
                placeholder="ข้อความปุ่ม"
              />
              <input
                type="text"
                value={organicHome.primaryCta.href}
                onChange={(e) =>
                  setOrganicHome({
                    ...organicHome,
                    primaryCta: { ...organicHome.primaryCta, href: e.target.value }
                  })
                }
                className="hui-input font-mono text-sm"
                placeholder="/page"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={organicHome.primaryCta.bgColor}
                  onChange={(e) =>
                    setOrganicHome({
                      ...organicHome,
                      primaryCta: { ...organicHome.primaryCta, bgColor: e.target.value }
                    })
                  }
                  className="hui-input font-mono text-xs"
                  placeholder="พื้นปุ่ม #RRGGBB"
                />
                <input
                  type="text"
                  value={organicHome.primaryCta.textColor}
                  onChange={(e) =>
                    setOrganicHome({
                      ...organicHome,
                      primaryCta: { ...organicHome.primaryCta, textColor: e.target.value }
                    })
                  }
                  className="hui-input font-mono text-xs"
                  placeholder="ตัวอักษร"
                />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-hui-border bg-white/40 p-3">
            <p className="mb-2 text-sm font-semibold text-hui-section">ปุ่มรอง (Secondary CTA)</p>
            <div className="space-y-2">
              <input
                type="text"
                value={organicHome.secondaryCta.label}
                onChange={(e) =>
                  setOrganicHome({
                    ...organicHome,
                    secondaryCta: { ...organicHome.secondaryCta, label: e.target.value }
                  })
                }
                className="hui-input text-sm"
              />
              <input
                type="text"
                value={organicHome.secondaryCta.href}
                onChange={(e) =>
                  setOrganicHome({
                    ...organicHome,
                    secondaryCta: { ...organicHome.secondaryCta, href: e.target.value }
                  })
                }
                className="hui-input font-mono text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={organicHome.secondaryCta.bgColor}
                  onChange={(e) =>
                    setOrganicHome({
                      ...organicHome,
                      secondaryCta: { ...organicHome.secondaryCta, bgColor: e.target.value }
                    })
                  }
                  className="hui-input font-mono text-xs"
                />
                <input
                  type="text"
                  value={organicHome.secondaryCta.textColor}
                  onChange={(e) =>
                    setOrganicHome({
                      ...organicHome,
                      secondaryCta: { ...organicHome.secondaryCta, textColor: e.target.value }
                    })
                  }
                  className="hui-input font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <p className="hui-label mb-2">สถิติ 3 คอลัมน์</p>
          <div className="grid gap-3 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-hui-border bg-white/40 p-3">
                <p className="mb-2 text-xs font-medium text-hui-muted">คอลัมน์ {i + 1}</p>
                <input
                  type="text"
                  value={organicHome.stats[i].value}
                  onChange={(e) => {
                    const stats = [...organicHome.stats];
                    stats[i] = { ...stats[i], value: e.target.value };
                    setOrganicHome({ ...organicHome, stats });
                  }}
                  className="hui-input mb-2 text-sm"
                  placeholder="14k+"
                />
                <input
                  type="text"
                  value={organicHome.stats[i].label}
                  onChange={(e) => {
                    const stats = [...organicHome.stats];
                    stats[i] = { ...stats[i], label: e.target.value };
                    setOrganicHome({ ...organicHome, stats });
                  }}
                  className="hui-input mb-2 text-sm"
                  placeholder="PRODUCT VARIETIES"
                />
                <div className="grid grid-cols-2 gap-1">
                  <input
                    type="text"
                    value={organicHome.stats[i].valueColor}
                    onChange={(e) => {
                      const stats = [...organicHome.stats];
                      stats[i] = { ...stats[i], valueColor: e.target.value };
                      setOrganicHome({ ...organicHome, stats });
                    }}
                    className="hui-input font-mono text-xs"
                    title="สีตัวเลข"
                  />
                  <input
                    type="text"
                    value={organicHome.stats[i].labelColor}
                    onChange={(e) => {
                      const stats = [...organicHome.stats];
                      stats[i] = { ...stats[i], labelColor: e.target.value };
                      setOrganicHome({ ...organicHome, stats });
                    }}
                    className="hui-input font-mono text-xs"
                    title="สีป้าย"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="hui-label mb-2">การ์ดฟีเจอร์ 3 ใบ</p>
          <div className="grid gap-3 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-hui-border bg-white/40 p-3">
                <p className="mb-2 text-xs font-medium text-hui-muted">การ์ด {i + 1}</p>
                <p className="mb-1 text-xs text-hui-muted">
                  รูปไอคอน (https) แทนชุด SVG — เว้นว่างแล้วใช้ไอคอนด้านล่าง
                </p>
                <input
                  type="url"
                  value={organicHome.features[i].iconImageUrl ?? ""}
                  onChange={(e) => {
                    const features = [...organicHome.features];
                    features[i] = { ...features[i], iconImageUrl: e.target.value };
                    setOrganicHome({ ...organicHome, features });
                  }}
                  className="hui-input mb-2 font-mono text-xs"
                  placeholder="https://... รูปไอคอน"
                  autoComplete="off"
                />
                <div className="mb-2 flex flex-wrap gap-2">
                  <label className="hui-btn-primary inline-flex cursor-pointer items-center justify-center text-xs disabled:opacity-50">
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={uploadBusy !== null}
                      onChange={(e) => onPickFeatureIcon(i, e)}
                    />
                    {uploadBusy === `organicIcon-${i}`
                      ? "กำลังอัปโหลด…"
                      : "อัปโหลดรูปไอคอน"}
                  </label>
                  <button
                    type="button"
                    className="rounded-xl border border-hui-border bg-white px-3 py-1.5 text-xs font-semibold text-hui-body hover:bg-hui-surface"
                    onClick={() => {
                      const features = [...organicHome.features];
                      features[i] = { ...features[i], iconImageUrl: "" };
                      setOrganicHome({ ...organicHome, features });
                    }}
                  >
                    ล้างรูป
                  </button>
                </div>
                <label htmlFor={`organic-feature-icon-preset-${i}`} className="hui-label text-xs">
                  ไอคอน SVG (เมื่อไม่มีรูป)
                </label>
                <select
                  id={`organic-feature-icon-preset-${i}`}
                  value={organicHome.features[i].icon}
                  onChange={(e) => {
                    const features = [...organicHome.features];
                    features[i] = { ...features[i], icon: e.target.value };
                    setOrganicHome({ ...organicHome, features });
                  }}
                  className="hui-input mb-2 text-sm"
                >
                  <option value="fresh">ฟาร์ม (fresh)</option>
                  <option value="organic">ออร์แกนิก (organic)</option>
                  <option value="delivery">จัดส่ง (delivery)</option>
                </select>
                <input
                  type="text"
                  value={organicHome.features[i].title}
                  onChange={(e) => {
                    const features = [...organicHome.features];
                    features[i] = { ...features[i], title: e.target.value };
                    setOrganicHome({ ...organicHome, features });
                  }}
                  className="hui-input mb-2 text-sm"
                  placeholder="หัวข้อ"
                />
                <textarea
                  rows={2}
                  value={organicHome.features[i].description}
                  onChange={(e) => {
                    const features = [...organicHome.features];
                    features[i] = { ...features[i], description: e.target.value };
                    setOrganicHome({ ...organicHome, features });
                  }}
                  className="hui-input mb-2 min-h-[2.5rem] text-sm"
                  placeholder="คำอธิบาย"
                />
                <input
                  type="text"
                  value={organicHome.features[i].cardBgColor}
                  onChange={(e) => {
                    const features = [...organicHome.features];
                    features[i] = { ...features[i], cardBgColor: e.target.value };
                    setOrganicHome({ ...organicHome, features });
                  }}
                  className="hui-input mb-1 font-mono text-xs"
                  placeholder="พื้นการ์ด #RRGGBB"
                />
                <div className="grid grid-cols-2 gap-1">
                  <input
                    type="text"
                    value={organicHome.features[i].titleColor}
                    onChange={(e) => {
                      const features = [...organicHome.features];
                      features[i] = { ...features[i], titleColor: e.target.value };
                      setOrganicHome({ ...organicHome, features });
                    }}
                    className="hui-input font-mono text-xs"
                    placeholder="สีหัวข้อ"
                  />
                  <input
                    type="text"
                    value={organicHome.features[i].descriptionColor}
                    onChange={(e) => {
                      const features = [...organicHome.features];
                      features[i] = { ...features[i], descriptionColor: e.target.value };
                      setOrganicHome({ ...organicHome, features });
                    }}
                    className="hui-input font-mono text-xs"
                    placeholder="สีคำอธิบาย"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-hui-border bg-white/40 p-4">
          <p className="hui-label mb-1">
            ชุมชนเพจ <span className="font-normal text-hui-muted">(แสดงบนหน้าเป็น «เพจชุมชน» ถัดจากเกมและรางวัล)</span>
          </p>
          <p className="hui-note mb-4 text-sm">
            ปุ่มดูทั้งหมดและการ์ด 3 ใบ · รูปเป็น{" "}
            <code className="rounded bg-hui-surface px-1">https://...</code> หรือ path เช่น{" "}
            <code className="rounded bg-hui-surface px-1">images/ชื่อรูป.jpg</code> (ในโฟลเดอร์เทมเพลต) ·
            ลิงก์ขึ้นต้นด้วย <code className="rounded bg-hui-surface px-1">/</code> หรือ{" "}
            <code className="rounded bg-hui-surface px-1">https://</code>
          </p>
          {(() => {
            const cp = mergeOrganicHomeFromApi({
              communityPage: organicHome.communityPage
            }).communityPage;
            return (
              <>
                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="hui-label text-xs">ข้อความปุ่มดูทั้งหมด</label>
                    <input
                      type="text"
                      value={cp.viewAllLabel}
                      onChange={(e) =>
                        setOrganicHome((oh) => {
                          const m = mergeOrganicHomeFromApi({
                            communityPage: oh.communityPage
                          }).communityPage;
                          return { ...oh, communityPage: { ...m, viewAllLabel: e.target.value } };
                        })
                      }
                      className="hui-input text-sm"
                      placeholder="ดูทั้งหมด"
                    />
                  </div>
                  <div>
                    <label className="hui-label text-xs">ลิงก์ปุ่มดูทั้งหมด</label>
                    <input
                      type="text"
                      value={cp.viewAllHref}
                      onChange={(e) =>
                        setOrganicHome((oh) => {
                          const m = mergeOrganicHomeFromApi({
                            communityPage: oh.communityPage
                          }).communityPage;
                          return { ...oh, communityPage: { ...m, viewAllHref: e.target.value } };
                        })
                      }
                      className="hui-input font-mono text-xs"
                      placeholder="/community หรือ https://..."
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-hui-border bg-white/50 p-3"
                    >
                      <p className="mb-2 text-xs font-medium text-hui-muted">การ์ด {i + 1}</p>
                      <label className="hui-label text-xs">URL รูปหน้าปก</label>
                      <input
                        type="text"
                        value={cp.posts[i].imageUrl ?? ""}
                        onChange={(e) =>
                          setOrganicHome((oh) => {
                            const m = mergeOrganicHomeFromApi({
                              communityPage: oh.communityPage
                            }).communityPage;
                            const posts = m.posts.map((p, idx) =>
                              idx === i ? { ...p, imageUrl: e.target.value } : p
                            );
                            return { ...oh, communityPage: { ...m, posts } };
                          })
                        }
                        className="hui-input mb-2 font-mono text-xs"
                        placeholder="https://... หรือ images/..."
                        autoComplete="off"
                      />
                      <div className="mb-2 flex flex-wrap gap-2">
                        <label className="hui-btn-primary inline-flex cursor-pointer items-center justify-center text-xs disabled:opacity-50">
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            disabled={uploadBusy !== null}
                            onChange={(ev) => onPickCommunityPostImage(i, ev)}
                          />
                          {uploadBusy === `organicCommunity-${i}`
                            ? "กำลังอัปโหลด…"
                            : "อัปโหลดรูป"}
                        </label>
                      </div>
                      <label className="hui-label text-xs">ลิงก์การ์ด</label>
                      <input
                        type="text"
                        value={cp.posts[i].href ?? ""}
                        onChange={(e) =>
                          setOrganicHome((oh) => {
                            const m = mergeOrganicHomeFromApi({
                              communityPage: oh.communityPage
                            }).communityPage;
                            const posts = m.posts.map((p, idx) =>
                              idx === i ? { ...p, href: e.target.value } : p
                            );
                            return { ...oh, communityPage: { ...m, posts } };
                          })
                        }
                        className="hui-input mb-2 font-mono text-xs"
                        placeholder="# หรือ /path"
                        autoComplete="off"
                      />
                      <label className="hui-label text-xs">วันที่ (บรรทัดเดียว)</label>
                      <input
                        type="text"
                        value={cp.posts[i].dateLine ?? ""}
                        onChange={(e) =>
                          setOrganicHome((oh) => {
                            const m = mergeOrganicHomeFromApi({
                              communityPage: oh.communityPage
                            }).communityPage;
                            const posts = m.posts.map((p, idx) =>
                              idx === i ? { ...p, dateLine: e.target.value } : p
                            );
                            return { ...oh, communityPage: { ...m, posts } };
                          })
                        }
                        className="hui-input mb-2 text-sm"
                        placeholder="22 Aug 2021"
                      />
                      <label className="hui-label text-xs">หมวด / แท็ก</label>
                      <input
                        type="text"
                        value={cp.posts[i].category ?? ""}
                        onChange={(e) =>
                          setOrganicHome((oh) => {
                            const m = mergeOrganicHomeFromApi({
                              communityPage: oh.communityPage
                            }).communityPage;
                            const posts = m.posts.map((p, idx) =>
                              idx === i ? { ...p, category: e.target.value } : p
                            );
                            return { ...oh, communityPage: { ...m, posts } };
                          })
                        }
                        className="hui-input mb-2 text-sm"
                        placeholder="tips & tricks"
                      />
                      <label className="hui-label text-xs">หัวข้อ</label>
                      <input
                        type="text"
                        value={cp.posts[i].title ?? ""}
                        onChange={(e) =>
                          setOrganicHome((oh) => {
                            const m = mergeOrganicHomeFromApi({
                              communityPage: oh.communityPage
                            }).communityPage;
                            const posts = m.posts.map((p, idx) =>
                              idx === i ? { ...p, title: e.target.value } : p
                            );
                            return { ...oh, communityPage: { ...m, posts } };
                          })
                        }
                        className="hui-input mb-2 text-sm"
                        placeholder="หัวข้อโพสต์"
                      />
                      <label className="hui-label text-xs">คำโปรย</label>
                      <textarea
                        rows={3}
                        value={cp.posts[i].excerpt ?? ""}
                        onChange={(e) =>
                          setOrganicHome((oh) => {
                            const m = mergeOrganicHomeFromApi({
                              communityPage: oh.communityPage
                            }).communityPage;
                            const posts = m.posts.map((p, idx) =>
                              idx === i ? { ...p, excerpt: e.target.value } : p
                            );
                            return { ...oh, communityPage: { ...m, posts } };
                          })
                        }
                        className="hui-input min-h-[3rem] text-sm"
                        placeholder="ข้อความสั้นใต้หัวข้อ"
                      />
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>

        <div className="mt-8 border-t border-dashed border-hui-border pt-6">
          <p className="hui-label mb-1">หัวข้อแต่ละบล็อกในหน้า Organic</p>
          <p className="hui-note mb-4 text-sm">
            แก้ชื่อหลัก สีหลัก ข้อความย่อยใต้หัวข้อ (ถ้าไม่ใส่บางบล็อกจะซ่อนบรรทัดย่อย) และสีข้อความย่อย · ใช้{" "}
            <code className="rounded bg-hui-surface px-1">#RRGGBB</code> หรือ{" "}
            <code className="rounded bg-hui-surface px-1">rgba(...)</code>
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {ORGANIC_SECTION_HEADING_SIMPLE_KEYS.map(({ key, label }) => {
              const blk = organicHome.sectionHeadings?.[key];
              if (!blk) return null;
              return (
                <div
                  key={key}
                  className="rounded-lg border border-hui-border bg-white/40 p-3"
                >
                  <p className="mb-2 text-xs font-semibold text-hui-section">{label}</p>
                  <input
                    type="text"
                    value={blk.title}
                    onChange={(e) => {
                      const sectionHeadings = {
                        ...organicHome.sectionHeadings,
                        [key]: { ...blk, title: e.target.value }
                      };
                      setOrganicHome({ ...organicHome, sectionHeadings });
                    }}
                    className="hui-input mb-2 text-sm"
                    placeholder="หัวข้อหลัก"
                  />
                  <input
                    type="text"
                    value={blk.titleColor}
                    onChange={(e) => {
                      const sectionHeadings = {
                        ...organicHome.sectionHeadings,
                        [key]: { ...blk, titleColor: e.target.value }
                      };
                      setOrganicHome({ ...organicHome, sectionHeadings });
                    }}
                    className="hui-input mb-2 font-mono text-xs"
                    placeholder="สีหัวข้อ"
                  />
                  <textarea
                    rows={2}
                    value={blk.subtitle}
                    onChange={(e) => {
                      const sectionHeadings = {
                        ...organicHome.sectionHeadings,
                        [key]: { ...blk, subtitle: e.target.value }
                      };
                      setOrganicHome({ ...organicHome, sectionHeadings });
                    }}
                    className="hui-input mb-2 min-h-[2.5rem] text-sm"
                    placeholder="ข้อความย่อย (เว้นว่างได้)"
                  />
                  <input
                    type="text"
                    value={blk.subtitleColor}
                    onChange={(e) => {
                      const sectionHeadings = {
                        ...organicHome.sectionHeadings,
                        [key]: { ...blk, subtitleColor: e.target.value }
                      };
                      setOrganicHome({ ...organicHome, sectionHeadings });
                    }}
                    className="hui-input font-mono text-xs"
                    placeholder="สีข้อความย่อย"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </fieldset>

      <div className="rounded-xl border border-hui-border bg-white/60 p-4">
        <p className="hui-label">ฟุตเตอร์ — สีทึบโปร่งทับพื้นหลังจริงของแต่ละหน้า</p>
        <p className="hui-note mt-1 mb-3">
          พื้นหลังฟุตเตอร์ต่อเนื่องจากพื้นหลังหน้านั้น · แนะนำ{" "}
          <code className="rounded bg-hui-surface px-1">#2B121C</code>,{" "}
          <code className="rounded bg-hui-surface px-1">#1a1a1a</code>
        </p>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium text-hui-muted">บนหน้าแรก</p>
            <div className="relative h-16 overflow-hidden rounded-xl border border-hui-border" aria-hidden>
              <div className="absolute inset-0" style={previewHomeStyle} />
              {Object.keys(previewFooterOverlayStyle).length > 0 ? (
                <div className="absolute inset-0" style={previewFooterOverlayStyle} />
              ) : null}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-hui-muted">บนหน้าอื่น</p>
            <div className="relative h-16 overflow-hidden rounded-xl border border-hui-border" aria-hidden>
              <div className="absolute inset-0" style={previewInnerStyle} />
              {Object.keys(previewFooterOverlayStyle).length > 0 ? (
                <div className="absolute inset-0" style={previewFooterOverlayStyle} />
              ) : null}
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="footer-scrim-hex" className="hui-label">
            สีทึบ (#RRGGBB)
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
            ความทึบ: {footerScrimPercent}%
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
