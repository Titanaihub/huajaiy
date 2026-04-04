/**
 * ธีมหน้า /game (เกมและรางวัล) — เก็บใน site_theme.game_lobby_json
 */

const DEFAULT_GAME_LOBBY = {
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
  const t = String(s || "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t;
  return fallback;
}

function normalizeUrl(s) {
  const t = String(s || "").trim().slice(0, 2048);
  if (!t || !/^https:\/\//i.test(t)) return "";
  try {
    const u = new URL(t);
    if (u.protocol !== "https:") return "";
    return t;
  } catch {
    return "";
  }
}

function readOverlayPercent(rowValue, fallback) {
  if (rowValue === undefined || rowValue === null) return fallback;
  const n = Math.floor(Number(rowValue));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, n));
}

function mergeGameLobbyFromRow(raw) {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const d = DEFAULT_GAME_LOBBY;
  return {
    backgroundImageUrl: normalizeUrl(o.backgroundImageUrl) || "",
    bgGradientTop: normalizeHex(o.bgGradientTop, d.bgGradientTop),
    bgGradientMid: normalizeHex(o.bgGradientMid, d.bgGradientMid),
    bgGradientBottom: normalizeHex(o.bgGradientBottom, d.bgGradientBottom),
    imageOverlayPercent: readOverlayPercent(o.imageOverlayPercent, d.imageOverlayPercent),
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
 * @param {Record<string, unknown>} patch
 * @param {typeof DEFAULT_GAME_LOBBY} current
 */
function normalizeGameLobbyPayload(patch, current) {
  const c = mergeGameLobbyFromRow(current);
  const p = patch && typeof patch === "object" && !Array.isArray(patch) ? patch : {};
  const next = { ...c };
  if (p.backgroundImageUrl !== undefined) {
    next.backgroundImageUrl = normalizeUrl(p.backgroundImageUrl);
  }
  if (p.bgGradientTop !== undefined) {
    next.bgGradientTop = normalizeHex(p.bgGradientTop, c.bgGradientTop);
  }
  if (p.bgGradientMid !== undefined) {
    next.bgGradientMid = normalizeHex(p.bgGradientMid, c.bgGradientMid);
  }
  if (p.bgGradientBottom !== undefined) {
    next.bgGradientBottom = normalizeHex(p.bgGradientBottom, c.bgGradientBottom);
  }
  if (p.imageOverlayPercent !== undefined) {
    next.imageOverlayPercent = readOverlayPercent(p.imageOverlayPercent, c.imageOverlayPercent);
  }
  const hexKeys = [
    "headerBackground",
    "headerBorder",
    "navLinkColor",
    "navLinkHoverColor",
    "navMutedColor",
    "iconButtonColor",
    "iconButtonHoverBg",
    "pageHeadingColor",
    "searchLabelColor",
    "searchInputBackground",
    "searchInputBorder",
    "searchInputText",
    "searchPlaceholderColor",
    "cardBackground",
    "cardBorder",
    "cardMediaBackground",
    "cardTitleColor",
    "cardMutedColor",
    "cardBodyColor",
    "cardHeartColor",
    "cardCtaColor",
    "cardCtaHoverColor",
    "footerNavColor",
    "footerNavHoverColor"
  ];
  for (const k of hexKeys) {
    if (p[k] !== undefined) {
      next[k] = normalizeHex(p[k], c[k]);
    }
  }
  return mergeGameLobbyFromRow(next);
}

module.exports = {
  DEFAULT_GAME_LOBBY,
  mergeGameLobbyFromRow,
  normalizeGameLobbyPayload
};
