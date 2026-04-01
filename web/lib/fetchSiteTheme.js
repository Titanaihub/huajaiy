import { headers } from "next/headers";
import { getApiBase } from "./config";

const FALLBACK_THEME = {
  backgroundImageUrl: "",
  bgGradientTop: "#FFF5F8",
  bgGradientMid: "#FFEEF3",
  bgGradientBottom: "#FFD6E2",
  imageOverlayPercent: 78
};

function normalizeTheme(t) {
  const opNum = Number(t.imageOverlayPercent);
  return {
    backgroundImageUrl: String(t.backgroundImageUrl ?? ""),
    bgGradientTop: String(t.bgGradientTop ?? FALLBACK_THEME.bgGradientTop),
    bgGradientMid: String(t.bgGradientMid ?? FALLBACK_THEME.bgGradientMid),
    bgGradientBottom: String(t.bgGradientBottom ?? FALLBACK_THEME.bgGradientBottom),
    imageOverlayPercent: Number.isFinite(opNum)
      ? Math.min(100, Math.max(0, Math.floor(opNum)))
      : FALLBACK_THEME.imageOverlayPercent
  };
}

async function fetchThemeFromUrl(url) {
  const r = await fetch(url, { cache: "no-store" });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok || !data.theme) return null;
  return normalizeTheme(data.theme);
}

/**
 * ดึงธีมสำหรับ Root layout (SSR)
 * ลอง same-origin ก่อน (ผ่าน rewrite ของ Next) แล้วค่อยยิงตรง API — ลดปัญหา env ฝั่งเว็บชี้ API ไม่ตรง
 */
export async function fetchSiteThemeForLayout() {
  const baseExternal = getApiBase().replace(/\/$/, "");
  const externalUrl = `${baseExternal}/api/public/site-theme`;
  const tryUrls = [];

  try {
    const h = await headers();
    const host =
      h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host") || "";
    const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    if (host) {
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
}
