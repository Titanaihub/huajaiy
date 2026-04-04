/** ค่าเริ่มต้นธีมหน้า /game — ต้องสอดคล้องกับ services/gameLobbyTheme.js */

export const FALLBACK_GAME_LOBBY_THEME = {
  backgroundImageUrl: "",
  bgGradientTop: "#f1f5f9",
  bgGradientMid: "#e8eef5",
  bgGradientBottom: "#f8fafc",
  imageOverlayPercent: 78,
  headerBackground: "#ffffff",
  headerBorder: "#e5e7eb",
  navLinkColor: "#334155",
  navLinkHoverColor: "#e11d48",
  navMutedColor: "#94a3b8",
  iconButtonColor: "#1f2937",
  iconButtonHoverBg: "#f3f4f6",
  pageHeadingColor: "#0f172a",
  searchLabelColor: "#7a1830",
  searchInputBackground: "#ffffff",
  searchInputBorder: "#f0d6dc",
  searchInputText: "#3b2f35",
  searchPlaceholderColor: "#c7a7ad",
  cardBackground: "#ffffff",
  cardBorder: "#f0d6dc",
  cardMediaBackground: "#f1f5f9",
  cardTitleColor: "#8a1c3a",
  cardMutedColor: "#8c7a80",
  cardBodyColor: "#3b2f35",
  cardHeartColor: "#e11d48",
  cardCtaColor: "#8a1c3a",
  cardCtaHoverColor: "#d72654",
  footerNavColor: "#334155",
  footerNavHoverColor: "#be123c"
};

function normalizeHex(s, fallback) {
  return /^#[0-9A-Fa-f]{6}$/.test(String(s || "").trim())
    ? String(s).trim()
    : fallback;
}

/** @param {Record<string, unknown> | null | undefined} raw */
export function mergeGameLobbyFromApi(raw) {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const d = FALLBACK_GAME_LOBBY_THEME;
  const n = (x, fb) => {
    const v = Math.floor(Number(x));
    return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : fb;
  };
  let bgUrl = String(o.backgroundImageUrl ?? "").trim().slice(0, 2048);
  if (bgUrl && !/^https:\/\//i.test(bgUrl)) bgUrl = "";
  return {
    backgroundImageUrl: bgUrl,
    bgGradientTop: normalizeHex(o.bgGradientTop, d.bgGradientTop),
    bgGradientMid: normalizeHex(o.bgGradientMid, d.bgGradientMid),
    bgGradientBottom: normalizeHex(o.bgGradientBottom, d.bgGradientBottom),
    imageOverlayPercent: n(o.imageOverlayPercent, d.imageOverlayPercent),
    headerBackground: normalizeHex(o.headerBackground, d.headerBackground),
    headerBorder: normalizeHex(o.headerBorder, d.headerBorder),
    navLinkColor: normalizeHex(o.navLinkColor, d.navLinkColor),
    navLinkHoverColor: normalizeHex(o.navLinkHoverColor, d.navLinkHoverColor),
    navMutedColor: normalizeHex(o.navMutedColor, d.navMutedColor),
    iconButtonColor: normalizeHex(o.iconButtonColor, d.iconButtonColor),
    iconButtonHoverBg: normalizeHex(o.iconButtonHoverBg, d.iconButtonHoverBg),
    pageHeadingColor: normalizeHex(o.pageHeadingColor, d.pageHeadingColor),
    searchLabelColor: normalizeHex(o.searchLabelColor, d.searchLabelColor),
    searchInputBackground: normalizeHex(o.searchInputBackground, d.searchInputBackground),
    searchInputBorder: normalizeHex(o.searchInputBorder, d.searchInputBorder),
    searchInputText: normalizeHex(o.searchInputText, d.searchInputText),
    searchPlaceholderColor: normalizeHex(o.searchPlaceholderColor, d.searchPlaceholderColor),
    cardBackground: normalizeHex(o.cardBackground, d.cardBackground),
    cardBorder: normalizeHex(o.cardBorder, d.cardBorder),
    cardMediaBackground: normalizeHex(o.cardMediaBackground, d.cardMediaBackground),
    cardTitleColor: normalizeHex(o.cardTitleColor, d.cardTitleColor),
    cardMutedColor: normalizeHex(o.cardMutedColor, d.cardMutedColor),
    cardBodyColor: normalizeHex(o.cardBodyColor, d.cardBodyColor),
    cardHeartColor: normalizeHex(o.cardHeartColor, d.cardHeartColor),
    cardCtaColor: normalizeHex(o.cardCtaColor, d.cardCtaColor),
    cardCtaHoverColor: normalizeHex(o.cardCtaHoverColor, d.cardCtaHoverColor),
    footerNavColor: normalizeHex(o.footerNavColor, d.footerNavColor),
    footerNavHoverColor: normalizeHex(o.footerNavHoverColor, d.footerNavHoverColor)
  };
}

/**
 * CSS variables สำหรับ HomeStylePublicHeader + พื้นที่เนื้อหา /game
 * @param {ReturnType<typeof mergeGameLobbyFromApi>} t
 */
export function gameLobbyShellCssVars(t) {
  return {
    "--gl-header-bg": t.headerBackground,
    "--gl-header-border": t.headerBorder,
    "--gl-nav": t.navLinkColor,
    "--gl-nav-hover": t.navLinkHoverColor,
    "--gl-nav-muted": t.navMutedColor,
    "--gl-icon": t.iconButtonColor,
    "--gl-icon-hover-bg": t.iconButtonHoverBg,
    "--gl-page-heading": t.pageHeadingColor,
    "--gl-search-label": t.searchLabelColor,
    "--gl-search-bg": t.searchInputBackground,
    "--gl-search-border": t.searchInputBorder,
    "--gl-search-text": t.searchInputText,
    "--gl-search-ph": t.searchPlaceholderColor,
    "--gl-card-bg": t.cardBackground,
    "--gl-card-border": t.cardBorder,
    "--gl-card-media-bg": t.cardMediaBackground,
    "--gl-card-title": t.cardTitleColor,
    "--gl-card-muted": t.cardMutedColor,
    "--gl-card-body": t.cardBodyColor,
    "--gl-card-heart": t.cardHeartColor,
    "--gl-card-cta": t.cardCtaColor,
    "--gl-card-cta-hover": t.cardCtaHoverColor,
    "--gl-empty-text": t.cardBodyColor,
    "--gl-empty-muted": t.cardMutedColor,
    "--gl-footer-nav": t.footerNavColor,
    "--gl-footer-nav-hover": t.footerNavHoverColor
  };
}
