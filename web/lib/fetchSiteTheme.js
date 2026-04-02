import { headers } from "next/headers";
import { getApiBase } from "./config";

const FALLBACK_THEME = {
  backgroundImageUrl: "",
  bgGradientTop: "#FFF5F8",
  bgGradientMid: "#FFEEF3",
  bgGradientBottom: "#FFD6E2",
  imageOverlayPercent: 78,
  footerScrimHex: "#2B121C",
  footerScrimPercent: 48,
  innerBackgroundImageUrl: "",
  innerBgGradientTop: "#FFF5F8",
  innerBgGradientMid: "#FFEEF3",
  innerBgGradientBottom: "#FFD6E2",
  innerImageOverlayPercent: 78
};

function clampPct(n, fb) {
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.floor(n))) : fb;
}

function normalizeTheme(t) {
  const opNum = Number(t.imageOverlayPercent);
  const fpNum = Number(t.footerScrimPercent);
  const iopNum = Number(t.innerImageOverlayPercent);
  return {
    backgroundImageUrl: String(t.backgroundImageUrl ?? ""),
    bgGradientTop: String(t.bgGradientTop ?? FALLBACK_THEME.bgGradientTop),
    bgGradientMid: String(t.bgGradientMid ?? FALLBACK_THEME.bgGradientMid),
    bgGradientBottom: String(t.bgGradientBottom ?? FALLBACK_THEME.bgGradientBottom),
    imageOverlayPercent: clampPct(opNum, FALLBACK_THEME.imageOverlayPercent),
    footerScrimHex: /^#[0-9A-Fa-f]{6}$/.test(String(t.footerScrimHex ?? "").trim())
      ? String(t.footerScrimHex).trim()
      : FALLBACK_THEME.footerScrimHex,
    footerScrimPercent: clampPct(fpNum, FALLBACK_THEME.footerScrimPercent),
    innerBackgroundImageUrl: String(t.innerBackgroundImageUrl ?? ""),
    innerBgGradientTop: String(t.innerBgGradientTop ?? FALLBACK_THEME.innerBgGradientTop),
    innerBgGradientMid: String(t.innerBgGradientMid ?? FALLBACK_THEME.innerBgGradientMid),
    innerBgGradientBottom: String(
      t.innerBgGradientBottom ?? FALLBACK_THEME.innerBgGradientBottom
    ),
    innerImageOverlayPercent: clampPct(iopNum, FALLBACK_THEME.innerImageOverlayPercent)
  };
}

async function fetchThemeFromUrl(url) {
  const r = await fetch(url, { cache: "no-store" });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok || !data.theme) return null;
  return normalizeTheme(data.theme);
}

function isLocalDevHost(host) {
  const h = String(host || "")
    .split(":")[0]
    .toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

/**
 * ดึงธีมสำหรับ Root layout (SSR)
 *
 * ห้าม fetch ไป origin เว็บตัวเองตอน production SSR — คำขอจะวนเข้า worker เดียวกัน
 * (เช่น Render) แล้วค้าง/deadlock จน Next ขึ้น Application error
 * ใช้ same-origin ได้แค่ local dev ที่ rewrite `/api/public` ไป API
 */
export async function fetchSiteThemeForLayout() {
  try {
    const baseExternal = getApiBase().replace(/\/$/, "");
    const externalUrl = `${baseExternal}/api/public/site-theme`;
    const tryUrls = [];

    try {
      const h = await headers();
      const host =
        h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host") || "";
      const proto =
        h.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
      if (host && isLocalDevHost(host)) {
        tryUrls.push(`${proto}://${host}/api/public/site-theme`);
      }
    } catch {
      /* ไม่มี request context */
    }

    if (!tryUrls.includes(externalUrl)) tryUrls.push(externalUrl);

    for (const url of tryUrls) {
      try {
        const theme = await fetchThemeFromUrl(url);
        if (theme) return theme;
      } catch {
        /* ลอง URL ถัดไป */
      }
    }

    return { ...FALLBACK_THEME };
  } catch {
    return { ...FALLBACK_THEME };
  }
}
