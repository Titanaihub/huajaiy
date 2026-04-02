import { normalizePathnameForTheme } from "./pathnameNormalize";

/** หน้าเปิดเทมเพลตหลังบ้านแบบ iframe เต็มจอ — ไม่ใช้พื้นหลังธีมเว็บหลัก (กลาแล็กซี/ชุด inner) */
const THEME_LAB_FULL_EMBED_PATHS = new Set([
  "/theme-lab/tailadmin",
  "/theme-lab/dashui",
  "/theme-lab/purdue",
  "/theme-lab/original"
]);

export function isThemeLabFullPageEmbedPath(pathname) {
  return THEME_LAB_FULL_EMBED_PATHS.has(normalizePathnameForTheme(pathname));
}

/** พื้นหลังเรียบให้ `<html>` ตอนดูเทมเพลต — ไม่ดึงรูป/ไล่สีจากแอดมิน */
export function buildThemeLabEmbedHtmlBackgroundStyle() {
  return {
    backgroundImage: "none",
    backgroundColor: "#f1f5f9",
    backgroundAttachment: "scroll",
    backgroundSize: "auto",
    backgroundPosition: "left top",
    backgroundRepeat: "no-repeat"
  };
}

function hexToRgb(hex) {
  const h = String(hex || "").replace(/^#/, "");
  if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) return { r: 255, g: 245, b: 248 };
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbaFromHex(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${r},${g},${b},${a})`;
}

/** URL สำหรับ CSS — ค่าควรมาจาก API (จำกัด https) */
function cssUrlQuoted(url) {
  const u = String(url).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `url("${u}")`;
}

/**
 * เลือกชุดพื้นหลังตาม path — `/` เท่านั้น = หน้าแรก ที่เหลือ = ชุด inner
 * @param {object} fullTheme ธีมเต็มจาก API (มี inner*)
 * @param {string} pathname
 */
export function pickBackgroundSliceForPathname(fullTheme, pathname) {
  const p = normalizePathnameForTheme(pathname);
  const isHome = p === "/";
  if (isHome) {
    return {
      backgroundImageUrl: fullTheme.backgroundImageUrl,
      bgGradientTop: fullTheme.bgGradientTop,
      bgGradientMid: fullTheme.bgGradientMid,
      bgGradientBottom: fullTheme.bgGradientBottom,
      imageOverlayPercent: fullTheme.imageOverlayPercent
    };
  }
  const op = Number(fullTheme.innerImageOverlayPercent);
  return {
    backgroundImageUrl: String(fullTheme.innerBackgroundImageUrl ?? ""),
    bgGradientTop: String(fullTheme.innerBgGradientTop ?? "#FFF5F8"),
    bgGradientMid: String(fullTheme.innerBgGradientMid ?? "#FFEEF3"),
    bgGradientBottom: String(fullTheme.innerBgGradientBottom ?? "#FFD6E2"),
    imageOverlayPercent: Number.isFinite(op)
      ? Math.min(100, Math.max(0, Math.floor(op)))
      : 78
  };
}

/**
 * สไตล์พื้นหลังให้ใส่ที่ `<html>` (layout ราก) — `<body>` โปร่งเพื่อให้ทุกหน้าเห็นชุดเดียวกัน
 * @param {{ backgroundImageUrl?: string, bgGradientTop?: string, bgGradientMid?: string, bgGradientBottom?: string, imageOverlayPercent?: number }} theme
 */
export function buildSiteRootBackgroundStyle(theme) {
  const top = theme?.bgGradientTop || "#FFF5F8";
  const mid = theme?.bgGradientMid || "#FFEEF3";
  const bot = theme?.bgGradientBottom || "#FFD6E2";
  const opRaw = Number(theme?.imageOverlayPercent);
  const overlay = Math.min(
    100,
    Math.max(0, Math.floor(Number.isFinite(opRaw) ? opRaw : 78))
  );
  /** สเกลความทึบ: ค่าเต็ม 100% เคยทำให้รูปโทนอ่อน (เช่น ชมพูพาสเทล) แทบมองไม่เห็น */
  const a = (overlay / 100) * 0.62;
  const img = String(theme?.backgroundImageUrl || "").trim();

  const gradOnly = `linear-gradient(180deg, ${top} 0%, ${mid} 52%, ${bot} 100%)`;

  if (!img || !/^https:\/\//i.test(img)) {
    return {
      backgroundImage: gradOnly,
      /** scroll = พื้นหลังเลื่อนตามหน้า (fixed ทำให้แยกจากเนื้อหา) */
      backgroundAttachment: "scroll",
      backgroundSize: "cover",
      backgroundPosition: "center top",
      backgroundRepeat: "no-repeat"
    };
  }

  /** 0% = ไม่ทับสี — ใช้แค่รูป ลดปัญหาเลเยอร์โปร่งบางเบราว์เซอร์ */
  if (a < 0.001) {
    return {
      backgroundImage: cssUrlQuoted(img),
      backgroundAttachment: "scroll",
      backgroundSize: "cover",
      backgroundPosition: "center top",
      backgroundRepeat: "no-repeat"
    };
  }

  const overlayLayer = `linear-gradient(180deg, ${rgbaFromHex(top, a)} 0%, ${rgbaFromHex(mid, a)} 52%, ${rgbaFromHex(bot, a)} 100%)`;

  return {
    backgroundImage: `${overlayLayer}, ${cssUrlQuoted(img)}`,
    backgroundAttachment: "scroll, scroll",
    backgroundSize: "cover, cover",
    backgroundPosition: "center top, center top",
    backgroundRepeat: "no-repeat, no-repeat"
  };
}

/**
 * ฟุตเตอร์ — ไม่วาดรูป/ไล่สีซ้ำ (จะได้ต่อเนื่องกับพื้นหลัง `<body>`)
 * คืนเฉพาะเลเยอร์สีทึบโปร่งบนพื้นหลังเดิมที่โผล่มาจากด้านหลัง
 * @param {{ footerScrimHex?: string, footerScrimPercent?: number }} theme
 */
export function buildSiteFooterOverlayStyle(theme) {
  const scrimHex = theme?.footerScrimHex || "#2B121C";
  const pRaw = Number(theme?.footerScrimPercent);
  const p = Math.min(
    100,
    Math.max(0, Math.floor(Number.isFinite(pRaw) ? pRaw : 48))
  );
  const scrimA = p / 100;
  if (scrimA < 0.001) return {};

  const { r, g, b } = hexToRgb(scrimHex);
  return {
    backgroundColor: `rgba(${r},${g},${b},${scrimA})`
  };
}
