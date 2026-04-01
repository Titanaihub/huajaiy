import { getApiBase } from "./config";

const FALLBACK_THEME = {
  backgroundImageUrl: "",
  bgGradientTop: "#FFF5F8",
  bgGradientMid: "#FFEEF3",
  bgGradientBottom: "#FFD6E2",
  imageOverlayPercent: 78
};

/** ดึงธีมสำหรับ Root layout (SSR) */
export async function fetchSiteThemeForLayout() {
  const base = getApiBase().replace(/\/$/, "");
  try {
    const r = await fetch(`${base}/api/public/site-theme`, { cache: "no-store" });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.ok || !data.theme) return { ...FALLBACK_THEME };
    const t = data.theme;
    return {
      backgroundImageUrl: String(t.backgroundImageUrl ?? ""),
      bgGradientTop: String(t.bgGradientTop ?? FALLBACK_THEME.bgGradientTop),
      bgGradientMid: String(t.bgGradientMid ?? FALLBACK_THEME.bgGradientMid),
      bgGradientBottom: String(t.bgGradientBottom ?? FALLBACK_THEME.bgGradientBottom),
      imageOverlayPercent:
        typeof t.imageOverlayPercent === "number" && !Number.isNaN(t.imageOverlayPercent)
          ? t.imageOverlayPercent
          : FALLBACK_THEME.imageOverlayPercent
    };
  } catch {
    return { ...FALLBACK_THEME };
  }
}
