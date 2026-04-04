/**
 * เนื้อหา hero + การ์ดฟีเจอร์ 3 ใบ — หน้าแรก organic (iframe)
 * เก็บใน site_theme.organic_home_json (JSONB)
 */

const MAX_LEN = {
  short: 120,
  medium: 400,
  url: 2048
};

const ICON_KEYS = new Set(["fresh", "organic", "delivery"]);

function normalizeHttpsUrl(v) {
  if (v == null) return "";
  const s = String(v).trim().slice(0, MAX_LEN.url);
  if (!s) return "";
  if (!/^https:\/\//i.test(s)) return "";
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return "";
    return s;
  } catch {
    return "";
  }
}

function normalizeHex6(s, fallback) {
  const t = String(s || "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t;
  return fallback;
}

function trunc(s, max) {
  const x = String(s == null ? "" : s).trim();
  return x.length > max ? x.slice(0, max) : x;
}

const DEFAULT_ORGANIC_HOME = Object.freeze({
  heroBackgroundImageUrl: "",
  heroTitle: "ยินดีต้อนรับ สู่แพลตฟอร์มหัวใจ",
  heroTitleColor: "#DC3545",
  heroSubtitle: "ยกระดับกิจกรรม และ การโปรโมท ให้โดดเด่นยิ่งขึ้น",
  heroSubtitleColor: "#6C757D",
  primaryCta: Object.freeze({
    label: "START SHOPPING",
    href: "/shop",
    bgColor: "#212529",
    textColor: "#FFFFFF"
  }),
  secondaryCta: Object.freeze({
    label: "JOIN NOW",
    href: "/login",
    bgColor: "#198754",
    textColor: "#FFFFFF"
  }),
  stats: Object.freeze([
    Object.freeze({
      value: "14k+",
      label: "PRODUCT VARIETIES",
      valueColor: "#212529",
      labelColor: "#212529"
    }),
    Object.freeze({
      value: "50k+",
      label: "HAPPY CUSTOMERS",
      valueColor: "#212529",
      labelColor: "#212529"
    }),
    Object.freeze({
      value: "10+",
      label: "STORE LOCATIONS",
      valueColor: "#212529",
      labelColor: "#212529"
    })
  ]),
  features: Object.freeze([
    Object.freeze({
      icon: "fresh",
      title: "Fresh from farm",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipi elit.",
      cardBgColor: "#0D6EFD",
      titleColor: "#FFFFFF",
      descriptionColor: "rgba(255,255,255,0.92)"
    }),
    Object.freeze({
      icon: "organic",
      title: "100% Organic",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipi elit.",
      cardBgColor: "#6C757D",
      titleColor: "#FFFFFF",
      descriptionColor: "rgba(255,255,255,0.92)"
    }),
    Object.freeze({
      icon: "delivery",
      title: "Free delivery",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipi elit.",
      cardBgColor: "#DC3545",
      titleColor: "#FFFFFF",
      descriptionColor: "rgba(255,255,255,0.92)"
    })
  ])
});

function deepCloneDefault() {
  return {
    heroBackgroundImageUrl: DEFAULT_ORGANIC_HOME.heroBackgroundImageUrl,
    heroTitle: DEFAULT_ORGANIC_HOME.heroTitle,
    heroTitleColor: DEFAULT_ORGANIC_HOME.heroTitleColor,
    heroSubtitle: DEFAULT_ORGANIC_HOME.heroSubtitle,
    heroSubtitleColor: DEFAULT_ORGANIC_HOME.heroSubtitleColor,
    primaryCta: { ...DEFAULT_ORGANIC_HOME.primaryCta },
    secondaryCta: { ...DEFAULT_ORGANIC_HOME.secondaryCta },
    stats: DEFAULT_ORGANIC_HOME.stats.map((s) => ({ ...s })),
    features: DEFAULT_ORGANIC_HOME.features.map((f) => ({ ...f }))
  };
}

function normCta(raw, fb) {
  const o = raw && typeof raw === "object" ? raw : {};
  let href = trunc(o.href, 500);
  if (href && !href.startsWith("/") && !/^https:\/\//i.test(href)) href = fb.href;
  if (href && /^https:\/\//i.test(href) && !normalizeHttpsUrl(href)) href = fb.href;
  if (href && href.startsWith("/")) href = href.replace(/\/+/g, "/").slice(0, 500);
  return {
    label: trunc(o.label, MAX_LEN.short) || fb.label,
    href: href || fb.href,
    bgColor: normalizeHex6(o.bgColor, fb.bgColor),
    textColor: normalizeHex6(o.textColor, fb.textColor)
  };
}

function normStats(arr) {
  const fb = DEFAULT_ORGANIC_HOME.stats;
  const list = Array.isArray(arr) ? arr : [];
  return [0, 1, 2].map((i) => {
    const s = list[i] && typeof list[i] === "object" ? list[i] : {};
    const f = fb[i];
    return {
      value: trunc(s.value, 32) || f.value,
      label: trunc(s.label, MAX_LEN.short) || f.label,
      valueColor: normalizeHex6(s.valueColor, f.valueColor),
      labelColor: normalizeHex6(s.labelColor, f.labelColor)
    };
  });
}

function normFeatures(arr) {
  const fb = DEFAULT_ORGANIC_HOME.features;
  const list = Array.isArray(arr) ? arr : [];
  return [0, 1, 2].map((i) => {
    const s = list[i] && typeof list[i] === "object" ? list[i] : {};
    const f = fb[i];
    const icon = ICON_KEYS.has(String(s.icon || "").trim().toLowerCase())
      ? String(s.icon).trim().toLowerCase()
      : f.icon;
    return {
      icon,
      title: trunc(s.title, MAX_LEN.short) || f.title,
      description: trunc(s.description, MAX_LEN.medium) || f.description,
      cardBgColor: normalizeHex6(s.cardBgColor, f.cardBgColor),
      titleColor: normalizeHex6(s.titleColor, f.titleColor),
      descriptionColor: (() => {
        const c = String(s.descriptionColor || "").trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(c)) return c;
        if (c.startsWith("rgba(") || c.startsWith("rgb(")) {
          return trunc(c, 80) || f.descriptionColor;
        }
        return normalizeHex6(s.descriptionColor, f.descriptionColor);
      })()
    };
  });
}

/**
 * รวมข้อมูลจาก DB (อาจว่าง) กับค่าเริ่มต้น
 * @param {unknown} rawJson
 */
function mergeOrganicHomeFromRow(rawJson) {
  const base = deepCloneDefault();
  let raw = rawJson;
  if (raw == null) return base;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return base;
    }
  }
  if (!raw || typeof raw !== "object") return base;
  const o = raw;
  base.heroBackgroundImageUrl =
    normalizeHttpsUrl(o.heroBackgroundImageUrl) || "";
  base.heroTitle = trunc(o.heroTitle, MAX_LEN.short) || base.heroTitle;
  base.heroTitleColor = normalizeHex6(o.heroTitleColor, base.heroTitleColor);
  base.heroSubtitle = trunc(o.heroSubtitle, MAX_LEN.medium) || base.heroSubtitle;
  base.heroSubtitleColor = normalizeHex6(
    o.heroSubtitleColor,
    base.heroSubtitleColor
  );
  base.primaryCta = normCta(o.primaryCta, base.primaryCta);
  base.secondaryCta = normCta(o.secondaryCta, base.secondaryCta);
  base.stats = normStats(o.stats);
  base.features = normFeatures(o.features);
  return base;
}

/**
 * รับวัตถุจากแอดมิน (บันทึกเต็มชุด)
 * @param {unknown} input
 */
function normalizeOrganicHomePayload(input) {
  return mergeOrganicHomeFromRow(input);
}

module.exports = {
  DEFAULT_ORGANIC_HOME,
  mergeOrganicHomeFromRow,
  normalizeOrganicHomePayload,
  normalizeHttpsUrl,
  normalizeHex6
};
