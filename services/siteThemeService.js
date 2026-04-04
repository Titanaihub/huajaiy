const { getPool } = require("../db/pool");
const organicHomeContent = require("./organicHomeContent");

const DEFAULT_THEME = {
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

function normalizeHex(s) {
  const t = String(s || "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t;
  return null;
}

function normalizeUrl(s) {
  const t = String(s || "").trim().slice(0, 2048);
  if (!t) return "";
  if (!/^https:\/\//i.test(t)) return "";
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

function rowToTheme(row) {
  if (!row) {
    return {
      ...DEFAULT_THEME,
      organicHome: organicHomeContent.mergeOrganicHomeFromRow(null)
    };
  }
  return {
    backgroundImageUrl: normalizeUrl(row.background_image_url) || "",
    bgGradientTop: normalizeHex(row.bg_gradient_top) || DEFAULT_THEME.bgGradientTop,
    bgGradientMid: normalizeHex(row.bg_gradient_mid) || DEFAULT_THEME.bgGradientMid,
    bgGradientBottom:
      normalizeHex(row.bg_gradient_bottom) || DEFAULT_THEME.bgGradientBottom,
    imageOverlayPercent: readOverlayPercent(
      row.image_overlay_percent,
      DEFAULT_THEME.imageOverlayPercent
    ),
    footerScrimHex: normalizeHex(row.footer_scrim_hex) || DEFAULT_THEME.footerScrimHex,
    footerScrimPercent: readOverlayPercent(
      row.footer_scrim_percent,
      DEFAULT_THEME.footerScrimPercent
    ),
    innerBackgroundImageUrl: normalizeUrl(row.inner_background_image_url) || "",
    innerBgGradientTop:
      normalizeHex(row.inner_bg_gradient_top) || DEFAULT_THEME.innerBgGradientTop,
    innerBgGradientMid:
      normalizeHex(row.inner_bg_gradient_mid) || DEFAULT_THEME.innerBgGradientMid,
    innerBgGradientBottom:
      normalizeHex(row.inner_bg_gradient_bottom) || DEFAULT_THEME.innerBgGradientBottom,
    innerImageOverlayPercent: readOverlayPercent(
      row.inner_image_overlay_percent,
      DEFAULT_THEME.innerImageOverlayPercent
    ),
    organicHome: organicHomeContent.mergeOrganicHomeFromRow(row.organic_home_json)
  };
}

async function getSiteTheme() {
  const pool = getPool();
  if (!pool) {
    return {
      ...DEFAULT_THEME,
      organicHome: organicHomeContent.mergeOrganicHomeFromRow(null)
    };
  }
  try {
    const r = await pool.query(
      `SELECT background_image_url, bg_gradient_top, bg_gradient_mid, bg_gradient_bottom,
              image_overlay_percent, footer_scrim_hex, footer_scrim_percent,
              inner_background_image_url, inner_bg_gradient_top, inner_bg_gradient_mid,
              inner_bg_gradient_bottom, inner_image_overlay_percent, organic_home_json
       FROM site_theme WHERE id = 1`
    );
    if (r.rows[0]) return rowToTheme(r.rows[0]);
  } catch (e) {
    console.warn("[siteTheme] read failed:", e.message);
  }
  return {
    ...DEFAULT_THEME,
    organicHome: organicHomeContent.mergeOrganicHomeFromRow(null)
  };
}

/**
 * @param {Partial<typeof DEFAULT_THEME>} patch
 */
async function updateSiteTheme(patch) {
  const pool = getPool();
  if (!pool) {
    const err = new Error("ต้องใช้ PostgreSQL เพื่อบันทึกธีมเว็บ");
    err.code = "DB_REQUIRED";
    throw err;
  }
  const current = await getSiteTheme();
  const next = {
    backgroundImageUrl:
      patch.backgroundImageUrl !== undefined
        ? normalizeUrl(patch.backgroundImageUrl)
        : current.backgroundImageUrl,
    bgGradientTop:
      patch.bgGradientTop !== undefined
        ? normalizeHex(patch.bgGradientTop) || current.bgGradientTop
        : current.bgGradientTop,
    bgGradientMid:
      patch.bgGradientMid !== undefined
        ? normalizeHex(patch.bgGradientMid) || current.bgGradientMid
        : current.bgGradientMid,
    bgGradientBottom:
      patch.bgGradientBottom !== undefined
        ? normalizeHex(patch.bgGradientBottom) || current.bgGradientBottom
        : current.bgGradientBottom,
    imageOverlayPercent:
      patch.imageOverlayPercent !== undefined
        ? readOverlayPercent(patch.imageOverlayPercent, current.imageOverlayPercent)
        : current.imageOverlayPercent,
    footerScrimHex:
      patch.footerScrimHex !== undefined
        ? normalizeHex(patch.footerScrimHex) || current.footerScrimHex
        : current.footerScrimHex,
    footerScrimPercent:
      patch.footerScrimPercent !== undefined
        ? readOverlayPercent(patch.footerScrimPercent, current.footerScrimPercent)
        : current.footerScrimPercent,
    innerBackgroundImageUrl:
      patch.innerBackgroundImageUrl !== undefined
        ? normalizeUrl(patch.innerBackgroundImageUrl)
        : current.innerBackgroundImageUrl,
    innerBgGradientTop:
      patch.innerBgGradientTop !== undefined
        ? normalizeHex(patch.innerBgGradientTop) || current.innerBgGradientTop
        : current.innerBgGradientTop,
    innerBgGradientMid:
      patch.innerBgGradientMid !== undefined
        ? normalizeHex(patch.innerBgGradientMid) || current.innerBgGradientMid
        : current.innerBgGradientMid,
    innerBgGradientBottom:
      patch.innerBgGradientBottom !== undefined
        ? normalizeHex(patch.innerBgGradientBottom) || current.innerBgGradientBottom
        : current.innerBgGradientBottom,
    innerImageOverlayPercent:
      patch.innerImageOverlayPercent !== undefined
        ? readOverlayPercent(
            patch.innerImageOverlayPercent,
            current.innerImageOverlayPercent
          )
        : current.innerImageOverlayPercent,
    organicHome:
      patch.organicHome !== undefined
        ? organicHomeContent.normalizeOrganicHomePayload(patch.organicHome)
        : current.organicHome
  };

  await pool.query(
    `INSERT INTO site_theme (id, background_image_url, bg_gradient_top, bg_gradient_mid, bg_gradient_bottom,
      image_overlay_percent, footer_scrim_hex, footer_scrim_percent,
      inner_background_image_url, inner_bg_gradient_top, inner_bg_gradient_mid, inner_bg_gradient_bottom,
      inner_image_overlay_percent, organic_home_json, updated_at)
     VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET
       background_image_url = EXCLUDED.background_image_url,
       bg_gradient_top = EXCLUDED.bg_gradient_top,
       bg_gradient_mid = EXCLUDED.bg_gradient_mid,
       bg_gradient_bottom = EXCLUDED.bg_gradient_bottom,
       image_overlay_percent = EXCLUDED.image_overlay_percent,
       footer_scrim_hex = EXCLUDED.footer_scrim_hex,
       footer_scrim_percent = EXCLUDED.footer_scrim_percent,
       inner_background_image_url = EXCLUDED.inner_background_image_url,
       inner_bg_gradient_top = EXCLUDED.inner_bg_gradient_top,
       inner_bg_gradient_mid = EXCLUDED.inner_bg_gradient_mid,
       inner_bg_gradient_bottom = EXCLUDED.inner_bg_gradient_bottom,
       inner_image_overlay_percent = EXCLUDED.inner_image_overlay_percent,
       organic_home_json = EXCLUDED.organic_home_json,
       updated_at = NOW()`,
    [
      next.backgroundImageUrl || "",
      next.bgGradientTop,
      next.bgGradientMid,
      next.bgGradientBottom,
      next.imageOverlayPercent,
      next.footerScrimHex,
      next.footerScrimPercent,
      next.innerBackgroundImageUrl || "",
      next.innerBgGradientTop,
      next.innerBgGradientMid,
      next.innerBgGradientBottom,
      next.innerImageOverlayPercent,
      JSON.stringify(next.organicHome)
    ]
  );
  return next;
}

module.exports = {
  DEFAULT_THEME,
  getSiteTheme,
  updateSiteTheme,
  normalizeHex,
  normalizeUrl
};
