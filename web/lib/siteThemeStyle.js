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
 * สไตล์พื้นหลังให้ใส่ที่ `<body class="hui-root">`
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
  const a = overlay / 100;
  const img = String(theme?.backgroundImageUrl || "").trim();

  const gradOnly = `linear-gradient(180deg, ${top} 0%, ${mid} 52%, ${bot} 100%)`;

  if (!img || !/^https:\/\//i.test(img)) {
    return {
      backgroundImage: gradOnly,
      backgroundAttachment: "fixed",
      backgroundSize: "cover",
      backgroundPosition: "center center",
      backgroundRepeat: "no-repeat"
    };
  }

  const overlayLayer = `linear-gradient(180deg, ${rgbaFromHex(top, a)} 0%, ${rgbaFromHex(mid, a)} 52%, ${rgbaFromHex(bot, a)} 100%)`;

  return {
    backgroundImage: `${overlayLayer}, ${cssUrlQuoted(img)}`,
    backgroundAttachment: "fixed, fixed",
    backgroundSize: "cover, cover",
    backgroundPosition: "center center, center center",
    backgroundRepeat: "no-repeat, no-repeat"
  };
}
