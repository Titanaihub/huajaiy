const { getPool } = require("../db/pool");

const DEFAULT_THEME = {
  backgroundImageUrl: "",
  bgGradientTop: "#FFF5F8",
  bgGradientMid: "#FFEEF3",
  bgGradientBottom: "#FFD6E2",
  /** 0–100 ความทึบของเลเยอร์สีทับภาพ (ยิ่งสูง อ่านตัวหนังสือง่ายขึ้น) */
  imageOverlayPercent: 78
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

function rowToTheme(row) {
  if (!row) return { ...DEFAULT_THEME };
  return {
    backgroundImageUrl: row.background_image_url
      ? normalizeUrl(row.background_image_url) || ""
      : "",
    bgGradientTop: normalizeHex(row.bg_gradient_top) || DEFAULT_THEME.bgGradientTop,
    bgGradientMid: normalizeHex(row.bg_gradient_mid) || DEFAULT_THEME.bgGradientMid,
    bgGradientBottom:
      normalizeHex(row.bg_gradient_bottom) || DEFAULT_THEME.bgGradientBottom,
    imageOverlayPercent: (() => {
      const v = row.image_overlay_percent;
      if (v === undefined || v === null) return DEFAULT_THEME.imageOverlayPercent;
      const n = Math.floor(Number(v));
      if (!Number.isFinite(n)) return DEFAULT_THEME.imageOverlayPercent;
      return Math.min(100, Math.max(0, n));
    })()
  };
}

async function getSiteTheme() {
  const pool = getPool();
  if (!pool) {
    return { ...DEFAULT_THEME };
  }
  try {
    const r = await pool.query(
      `SELECT background_image_url, bg_gradient_top, bg_gradient_mid, bg_gradient_bottom, image_overlay_percent
       FROM site_theme WHERE id = 1`
    );
    if (r.rows[0]) return rowToTheme(r.rows[0]);
  } catch (e) {
    console.warn("[siteTheme] read failed:", e.message);
  }
  return { ...DEFAULT_THEME };
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
        ? Math.min(100, Math.max(0, Math.floor(Number(patch.imageOverlayPercent) || 0)))
        : current.imageOverlayPercent
  };

  await pool.query(
    `INSERT INTO site_theme (id, background_image_url, bg_gradient_top, bg_gradient_mid, bg_gradient_bottom, image_overlay_percent, updated_at)
     VALUES (1, $1, $2, $3, $4, $5, NOW())
     ON CONFLICT (id) DO UPDATE SET
       background_image_url = EXCLUDED.background_image_url,
       bg_gradient_top = EXCLUDED.bg_gradient_top,
       bg_gradient_mid = EXCLUDED.bg_gradient_mid,
       bg_gradient_bottom = EXCLUDED.bg_gradient_bottom,
       image_overlay_percent = EXCLUDED.image_overlay_percent,
       updated_at = NOW()`,
    [
      next.backgroundImageUrl || "",
      next.bgGradientTop,
      next.bgGradientMid,
      next.bgGradientBottom,
      next.imageOverlayPercent
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
