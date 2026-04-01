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
 * พื้นหลังฟุตเตอร์ — ใช้รูปเดียวกับธีมเว็บ + เลเยอร์สีทึบปรับได้ (อ่านลิงก์ง่าย)
 * @param {{ backgroundImageUrl?: string, bgGradientTop?: string, bgGradientMid?: string, bgGradientBottom?: string, footerScrimHex?: string, footerScrimPercent?: number }} theme
 */
export function buildSiteFooterBackgroundStyle(theme) {
  const top = theme?.bgGradientTop || "#FFF5F8";
  const mid = theme?.bgGradientMid || "#FFEEF3";
  const bot = theme?.bgGradientBottom || "#FFD6E2";
  const gradOnly = `linear-gradient(180deg, ${top} 0%, ${mid} 52%, ${bot} 100%)`;
  const img = String(theme?.backgroundImageUrl || "").trim();

  const scrimHex = theme?.footerScrimHex || "#2B121C";
  const pRaw = Number(theme?.footerScrimPercent);
  const p = Math.min(
    100,
    Math.max(0, Math.floor(Number.isFinite(pRaw) ? pRaw : 48))
  );
  const scrimA = p / 100;

  if (!img || !/^https:\/\//i.test(img)) {
    return {
      backgroundImage: gradOnly,
      backgroundAttachment: "scroll",
      backgroundSize: "cover",
      backgroundPosition: "center top",
      backgroundRepeat: "no-repeat"
    };
  }

  if (scrimA < 0.001) {
    return {
      backgroundImage: cssUrlQuoted(img),
      backgroundAttachment: "scroll",
      backgroundSize: "cover",
      backgroundPosition: "center top",
      backgroundRepeat: "no-repeat"
    };
  }

  const { r, g, b } = hexToRgb(scrimHex);
  const scrim = `linear-gradient(180deg, rgba(${r},${g},${b},${scrimA}) 0%, rgba(${r},${g},${b},${scrimA}) 100%)`;

  return {
    backgroundImage: `${scrim}, ${cssUrlQuoted(img)}`,
    backgroundAttachment: "scroll, scroll",
    backgroundSize: "cover, cover",
    backgroundPosition: "center top, center top",
    backgroundRepeat: "no-repeat, no-repeat"
  };
}
