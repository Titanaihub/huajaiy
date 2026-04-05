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

/** สีหัวข้อ/ข้อความย่อย — รองรับ #RRGGBB หรือ rgb/rgba */
function normOptionalTextColor(s, fallback) {
  const c = String(s || "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(c)) return c;
  if (c.startsWith("rgba(") || c.startsWith("rgb(")) {
    return trunc(c, 80) || fallback;
  }
  return normalizeHex6(s, fallback);
}

const DEFAULT_SECTION_HEADINGS = Object.freeze({
  category: Object.freeze({
    title: "Category",
    titleColor: "#212529",
    subtitle: "",
    subtitleColor: "#6C757D"
  }),
  bestSelling: Object.freeze({
    title: "Best selling products",
    titleColor: "#212529",
    subtitle: "",
    subtitleColor: "#6C757D"
  }),
  bannerSale1: Object.freeze({
    title: "Items on SALE",
    titleColor: "#FFFFFF",
    subtitle: "Discounts up to 30%",
    subtitleColor: "rgba(255,255,255,0.92)"
  }),
  bannerSale2: Object.freeze({
    title: "Combo offers",
    titleColor: "#FFFFFF",
    subtitle: "Discounts up to 50%",
    subtitleColor: "rgba(255,255,255,0.92)"
  }),
  bannerSale3: Object.freeze({
    title: "Discount Coupons",
    titleColor: "#FFFFFF",
    subtitle: "Discounts up to 40%",
    subtitleColor: "rgba(255,255,255,0.92)"
  }),
  featured: Object.freeze({
    title: "Featured products",
    titleColor: "#212529",
    subtitle: "",
    subtitleColor: "#6C757D"
  }),
  newsletter: Object.freeze({
    title: "Get 25% Discount on your first purchase",
    titleColor: "#FFFFFF",
    subtitle: "Just Sign Up & Register it now to become member.",
    subtitleColor: "rgba(255,255,255,0.9)"
  }),
  popular: Object.freeze({
    title: "Most popular products",
    titleColor: "#212529",
    subtitle: "",
    subtitleColor: "#6C757D"
  }),
  justArrived: Object.freeze({
    title: "Just arrived",
    titleColor: "#212529",
    subtitle: "",
    subtitleColor: "#6C757D"
  }),
  blog: Object.freeze({
    title: "เพจชุมชน",
    titleColor: "#212529",
    subtitle: "",
    subtitleColor: "#6C757D"
  }),
  appDownload: Object.freeze({
    title: "Download Organic App",
    titleColor: "#212529",
    subtitle: "Online Orders made easy, fast and reliable",
    subtitleColor: "#6C757D"
  }),
  seoLooking: Object.freeze({
    title: "People are also looking for",
    titleColor: "#212529",
    subtitle: "",
    subtitleColor: "#6C757D"
  }),
  gamePrize: Object.freeze({
    title: "เกมและรางวัล",
    titleColor: "#212529",
    subtitle: "สุ่มเกมเผยแพร่จากแพลตฟอร์ม — แตะการ์ดเพื่อเล่น",
    subtitleColor: "#6C757D"
  }),
  valueTrust: Object.freeze([
    Object.freeze({
      title: "Free delivery",
      titleColor: "#212529",
      subtitle: "Lorem ipsum dolor sit amet, consectetur adipi elit.",
      subtitleColor: "#6C757D"
    }),
    Object.freeze({
      title: "100% secure payment",
      titleColor: "#212529",
      subtitle: "Lorem ipsum dolor sit amet, consectetur adipi elit.",
      subtitleColor: "#6C757D"
    }),
    Object.freeze({
      title: "Quality guarantee",
      titleColor: "#212529",
      subtitle: "Lorem ipsum dolor sit amet, consectetur adipi elit.",
      subtitleColor: "#6C757D"
    }),
    Object.freeze({
      title: "guaranteed savings",
      titleColor: "#212529",
      subtitle: "Lorem ipsum dolor sit amet, consectetur adipi elit.",
      subtitleColor: "#6C757D"
    }),
    Object.freeze({
      title: "Daily offers",
      titleColor: "#212529",
      subtitle: "Lorem ipsum dolor sit amet, consectetur adipi elit.",
      subtitleColor: "#6C757D"
    })
  ])
});

/** การ์ดชุมชน — ไม่มีดีโมจากเทมเพลตเก่า (แอดมินเป็นคนกรอก) */
const EMPTY_COMMUNITY_POST = Object.freeze({
  imageUrl: "",
  href: "#",
  dateLine: "",
  category: "",
  title: "",
  excerpt: ""
});

const DEFAULT_COMMUNITY_PAGE_POSTS = Object.freeze([
  EMPTY_COMMUNITY_POST,
  EMPTY_COMMUNITY_POST,
  EMPTY_COMMUNITY_POST
]);

const LEGACY_BLOG_TITLE = new Set([
  "our recent blog",
  "our blog",
  "recent blog"
]);

const LEGACY_COMMUNITY_TITLE = new Set([
  "top 10 casual look ideas to dress up your kids",
  "latest trends of wearing street wears supremely",
  "10 different types of comfortable clothes ideas for women"
]);

function isLegacyDemoCommunityPost(p) {
  if (!p || typeof p !== "object") return false;
  const t = String(p.title || "")
    .trim()
    .toLowerCase();
  if (t && LEGACY_COMMUNITY_TITLE.has(t)) return true;
  const ex = String(p.excerpt || "").toLowerCase();
  if (ex.includes("lorem ipsum")) return true;
  const img = String(p.imageUrl || "").toLowerCase();
  if (/post-thumbnail-[123]\.jpg/i.test(img)) return true;
  return false;
}

/**
 * ตอบสาธารณะเท่านั้น — ตัดหัวข้อ/โพสต์ดีโมเก่า (ข้อมูลใน DB เดิมยังอยู่สำหรับแอดมิน)
 * @param {object} organicHome ผล mergeOrganicHomeFromRow แล้ว
 */
function sanitizeOrganicHomeForPublic(organicHome) {
  if (!organicHome || typeof organicHome !== "object") {
    return mergeOrganicHomeFromRow(null);
  }
  const blogIn = organicHome.sectionHeadings?.blog;
  const blog =
    blogIn && typeof blogIn === "object" ? { ...blogIn } : { ...DEFAULT_SECTION_HEADINGS.blog };
  const bt = String(blog.title || "").trim();
  const btl = bt.toLowerCase();
  if (!bt || LEGACY_BLOG_TITLE.has(btl)) {
    blog.title = DEFAULT_SECTION_HEADINGS.blog.title;
  }
  const sub = String(blog.subtitle || "").trim();
  if (sub.toLowerCase().includes("lorem ipsum")) {
    blog.subtitle = "";
  }
  const cpIn = organicHome.communityPage;
  const cpBase = normCommunityPage(cpIn != null ? cpIn : null);
  const posts = cpBase.posts.map((p) =>
    isLegacyDemoCommunityPost(p) ? { ...EMPTY_COMMUNITY_POST } : p
  );
  const sectionVisibility = {
    ...normSectionVisibility(organicHome.sectionVisibility),
    /* ปิดแสดงเพจชุมชนบนหน้าแรกชั่วคราว — ค่าใน DB / แอดมินไม่ถูกลบ */
    blog: false
  };
  return {
    ...organicHome,
    sectionHeadings: {
      ...organicHome.sectionHeadings,
      blog
    },
    communityPage: {
      ...cpBase,
      posts
    },
    sectionVisibility
  };
}

function normCommunityPostHref(v, fb) {
  const s = trunc(String(v == null ? "" : v), 500);
  if (!s || s === "#") return fb || "#";
  if (s.startsWith("/")) return s.replace(/\/+/g, "/").slice(0, 500);
  if (/^https:\/\//i.test(s)) return normalizeHttpsUrl(s) ? s : fb || "#";
  return fb || "#";
}

/** ลิงก์นำทาง — ว่างได้ (ไม่บังคับ fallback เป็น #) */
function normOptionalNavHref(v) {
  const s = trunc(String(v == null ? "" : v), 500);
  if (!s || s === "#") return "";
  if (s.startsWith("/")) return s.replace(/\/+/g, "/").slice(0, 500);
  if (/^https:\/\//i.test(s)) return normalizeHttpsUrl(s) ? s : "";
  return "";
}

function normCommunityImageUrl(v, fb) {
  const s = String(v || "").trim().slice(0, MAX_LEN.url);
  if (!s) return fb;
  if (/^https:\/\//i.test(s)) return normalizeHttpsUrl(s) ? s : fb;
  if (s.startsWith("/")) return trunc(s, MAX_LEN.url);
  if (/^images\//i.test(s)) return trunc(s, MAX_LEN.url);
  return fb;
}

function normCommunityPage(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const list = Array.isArray(o.posts) ? o.posts : [];
  const posts = [0, 1, 2].map((i) => {
    const s = list[i] && typeof list[i] === "object" ? list[i] : {};
    const f = DEFAULT_COMMUNITY_PAGE_POSTS[i];
    return {
      imageUrl: normCommunityImageUrl(s.imageUrl, f.imageUrl) || "",
      href: normCommunityPostHref(s.href, f.href),
      dateLine: trunc(s.dateLine, 80) || f.dateLine || "",
      category: trunc(s.category, 80) || f.category || "",
      title: trunc(s.title, MAX_LEN.short) || f.title || "",
      excerpt: trunc(s.excerpt, MAX_LEN.medium) || f.excerpt || ""
    };
  });
  return {
    viewAllHref: normCommunityPostHref(o.viewAllHref, "#"),
    viewAllLabel: trunc(o.viewAllLabel, MAX_LEN.short) || "ดูทั้งหมด",
    posts
  };
}

/** บล็อกที่แอดมินเปิด/ปิดได้ (หน้าแรก organic iframe) — คีย์ตรงกับ data-huajaiy-block */
const TOGGLEABLE_HOME_BLOCKS = [
  "bannerSales",
  "newsletter",
  "appDownload",
  "category",
  "bestSelling",
  "featured",
  "popular",
  "justArrived",
  "blog",
  "seoLooking"
];

const DEFAULT_PROMO_BANNER_CARD = Object.freeze({
  backgroundImageUrl: "",
  ctaLabel: "Shop Now",
  ctaHref: "#"
});

function normPromoBannerCard(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const fb = DEFAULT_PROMO_BANNER_CARD;
  const imgIn = o.backgroundImageUrl ?? o.imageUrl;
  const img =
    imgIn != null && String(imgIn).trim()
      ? normCommunityImageUrl(imgIn, "")
      : "";
  return {
    backgroundImageUrl: img || "",
    ctaLabel: trunc(o.ctaLabel, MAX_LEN.short) || fb.ctaLabel,
    ctaHref: normCommunityPostHref(o.ctaHref, fb.ctaHref)
  };
}

function normPromoBanners(arr) {
  const list = Array.isArray(arr) ? arr : [];
  return [0, 1, 2].map((i) => normPromoBannerCard(list[i]));
}

function normNewsletterBlockExtra(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const fb = {
    backgroundImageUrl: "",
    showForm: true,
    submitButtonLabel: "Submit",
    submitHref: ""
  };
  const bg =
    o.backgroundImageUrl != null && String(o.backgroundImageUrl).trim()
      ? normCommunityImageUrl(o.backgroundImageUrl, "")
      : "";
  return {
    backgroundImageUrl: bg || "",
    showForm: o.showForm !== false,
    submitButtonLabel:
      trunc(o.submitButtonLabel, MAX_LEN.short) || fb.submitButtonLabel,
    submitHref: normOptionalNavHref(o.submitHref)
  };
}

function normAppDownloadBlockExtra(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const fb = {
    sectionBackgroundColor: "",
    sideImageUrl: "",
    appStoreHref: "#",
    playStoreHref: "#"
  };
  const hex = String(o.sectionBackgroundColor || "").trim();
  const sectionBackgroundColor = /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : "";
  const side =
    o.sideImageUrl != null && String(o.sideImageUrl).trim()
      ? normCommunityImageUrl(o.sideImageUrl, "")
      : "";
  return {
    sectionBackgroundColor,
    sideImageUrl: side || "",
    appStoreHref: normCommunityPostHref(o.appStoreHref, fb.appStoreHref),
    playStoreHref: normCommunityPostHref(o.playStoreHref, fb.playStoreHref)
  };
}

const DEFAULT_SECTION_VISIBILITY = Object.freeze(
  Object.fromEntries(TOGGLEABLE_HOME_BLOCKS.map((k) => [k, true]))
);

function normSectionVisibility(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const out = {};
  for (const k of TOGGLEABLE_HOME_BLOCKS) {
    out[k] = o[k] === false ? false : true;
  }
  return out;
}

function normSectionHeadingBlock(raw, fb) {
  const o = raw && typeof raw === "object" ? raw : {};
  const hasSubtitleKey = Object.prototype.hasOwnProperty.call(o, "subtitle");
  return {
    title: trunc(o.title, MAX_LEN.short) || fb.title,
    titleColor: normOptionalTextColor(o.titleColor, fb.titleColor),
    subtitle: hasSubtitleKey
      ? trunc(String(o.subtitle == null ? "" : o.subtitle), MAX_LEN.medium)
      : fb.subtitle,
    subtitleColor: normOptionalTextColor(o.subtitleColor, fb.subtitleColor)
  };
}

function normValueTrustHeadings(raw, fbArr) {
  const list = Array.isArray(raw) ? raw : [];
  return [0, 1, 2, 3, 4].map((i) =>
    normSectionHeadingBlock(list[i], fbArr[i])
  );
}

function normSectionHeadings(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const fb = DEFAULT_SECTION_HEADINGS;
  return {
    category: normSectionHeadingBlock(o.category, fb.category),
    bestSelling: normSectionHeadingBlock(o.bestSelling, fb.bestSelling),
    bannerSale1: normSectionHeadingBlock(o.bannerSale1, fb.bannerSale1),
    bannerSale2: normSectionHeadingBlock(o.bannerSale2, fb.bannerSale2),
    bannerSale3: normSectionHeadingBlock(o.bannerSale3, fb.bannerSale3),
    featured: normSectionHeadingBlock(o.featured, fb.featured),
    newsletter: normSectionHeadingBlock(o.newsletter, fb.newsletter),
    popular: normSectionHeadingBlock(o.popular, fb.popular),
    justArrived: normSectionHeadingBlock(o.justArrived, fb.justArrived),
    blog: normSectionHeadingBlock(o.blog, fb.blog),
    appDownload: normSectionHeadingBlock(o.appDownload, fb.appDownload),
    seoLooking: normSectionHeadingBlock(o.seoLooking, fb.seoLooking),
    gamePrize: normSectionHeadingBlock(o.gamePrize, fb.gamePrize),
    valueTrust: normValueTrustHeadings(o.valueTrust, fb.valueTrust)
  };
}

const DEFAULT_ORGANIC_HOME = Object.freeze({
  heroBackgroundImageUrl: "",
  heroTitle: "ยินดีต้อนรับ สู่แพลตฟอร์มหัวใจ",
  heroTitleColor: "#DC3545",
  heroSubtitle: "ยกระดับกิจกรรม และ การโปรโมท ให้โดดเด่นยิ่งขึ้น",
  heroSubtitleColor: "#6C757D",
  primaryCta: Object.freeze({
    label: "เพจชุมชน",
    href: "/page",
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
      iconImageUrl: "",
      title: "Fresh from farm",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipi elit.",
      cardBgColor: "#0D6EFD",
      titleColor: "#FFFFFF",
      descriptionColor: "rgba(255,255,255,0.92)"
    }),
    Object.freeze({
      icon: "organic",
      iconImageUrl: "",
      title: "100% Organic",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipi elit.",
      cardBgColor: "#6C757D",
      titleColor: "#FFFFFF",
      descriptionColor: "rgba(255,255,255,0.92)"
    }),
    Object.freeze({
      icon: "delivery",
      iconImageUrl: "",
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
    features: DEFAULT_ORGANIC_HOME.features.map((f) => ({ ...f })),
    sectionHeadings: normSectionHeadings(null),
    sectionVisibility: normSectionVisibility(null),
    communityPage: normCommunityPage(null),
    promoBanners: normPromoBanners(null),
    newsletterBlock: normNewsletterBlockExtra(null),
    appDownloadBlock: normAppDownloadBlockExtra(null)
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
      iconImageUrl: normalizeHttpsUrl(s.iconImageUrl) || "",
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
  base.sectionHeadings = normSectionHeadings(o.sectionHeadings);
  base.sectionVisibility = normSectionVisibility(
    o.sectionVisibility != null ? o.sectionVisibility : base.sectionVisibility
  );
  base.communityPage = normCommunityPage(
    o.communityPage != null ? o.communityPage : base.communityPage
  );
  base.promoBanners = normPromoBanners(o.promoBanners);
  base.newsletterBlock = normNewsletterBlockExtra(o.newsletterBlock);
  base.appDownloadBlock = normAppDownloadBlockExtra(o.appDownloadBlock);
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
  DEFAULT_SECTION_HEADINGS,
  DEFAULT_SECTION_VISIBILITY,
  TOGGLEABLE_HOME_BLOCKS,
  mergeOrganicHomeFromRow,
  normalizeOrganicHomePayload,
  sanitizeOrganicHomeForPublic,
  normalizeHttpsUrl,
  normalizeHex6
};
