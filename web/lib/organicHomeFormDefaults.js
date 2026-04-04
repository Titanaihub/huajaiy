/** บล็อกหน้าแรกที่แอดมินเปิด/ปิดได้ — ตรงกับ data-huajaiy-block และ services/organicHomeContent.js */
export const ORGANIC_HOMEPAGE_BLOCK_KEYS = [
  "category",
  "bestSelling",
  "featured",
  "popular",
  "justArrived",
  "blog",
  "seoLooking"
];

export const ORGANIC_HOMEPAGE_BLOCK_TOGGLES = [
  { key: "category", label: "Category" },
  { key: "bestSelling", label: "Best selling products" },
  { key: "featured", label: "Featured products" },
  { key: "popular", label: "Most popular products" },
  { key: "justArrived", label: "Just arrived" },
  { key: "blog", label: "เพจชุมชน (ชุมชนเพจ)" },
  { key: "seoLooking", label: "People are also looking for" }
];

/** คีย์หัวข้อบล็อก (ไม่รวม valueTrust) — ป้ายไทยสำหรับแอดมิน */
export const ORGANIC_SECTION_HEADING_SIMPLE_KEYS = [
  {
    key: "gamePrize",
    label: "เกมและรางวัล (การ์ด 4 ใบ — สุ่มจากเกมเผยแพร่)"
  },
  { key: "category", label: "หมวดหมู่ (Category)" },
  { key: "bestSelling", label: "สินค้าขายดี (Best selling)" },
  { key: "bannerSale1", label: "แบนเนอร์ 1 — Items on SALE" },
  { key: "bannerSale2", label: "แบนเนอร์ 2 — Combo offers" },
  { key: "bannerSale3", label: "แบนเนอร์ 3 — Discount Coupons" },
  { key: "featured", label: "สินค้าแนะนำ (Featured)" },
  { key: "newsletter", label: "จดหมายข่าว / ส่วนลด" },
  { key: "popular", label: "ยอดนิยม (Most popular)" },
  { key: "justArrived", label: "สินค้าใหม่ (Just arrived)" },
  { key: "blog", label: "เพจชุมชน (ชุมชนเพจ)" },
  { key: "appDownload", label: "ดาวน์โหลดแอป" },
  { key: "seoLooking", label: "คำค้นยอดนิยม (People also looking)" }
];

export function createDefaultSectionVisibility() {
  return Object.fromEntries(ORGANIC_HOMEPAGE_BLOCK_KEYS.map((k) => [k, true]));
}

export function createDefaultCommunityPage() {
  return {
    viewAllHref: "#",
    viewAllLabel: "ดูทั้งหมด",
    posts: [
      {
        imageUrl: "images/post-thumbnail-1.jpg",
        href: "#",
        dateLine: "22 Aug 2021",
        category: "tips & tricks",
        title: "Top 10 casual look ideas to dress up your kids",
        excerpt:
          "Lorem ipsum dolor sit amet, consectetur adipi elit. Aliquet eleifend viverra enim tincidunt donec quam. A in arcu, hendrerit neque dolor morbi..."
      },
      {
        imageUrl: "images/post-thumbnail-2.jpg",
        href: "#",
        dateLine: "25 Aug 2021",
        category: "trending",
        title: "Latest trends of wearing street wears supremely",
        excerpt:
          "Lorem ipsum dolor sit amet, consectetur adipi elit. Aliquet eleifend viverra enim tincidunt donec quam. A in arcu, hendrerit neque dolor morbi..."
      },
      {
        imageUrl: "images/post-thumbnail-3.jpg",
        href: "#",
        dateLine: "28 Aug 2021",
        category: "inspiration",
        title: "10 Different Types of comfortable clothes ideas for women",
        excerpt:
          "Lorem ipsum dolor sit amet, consectetur adipi elit. Aliquet eleifend viverra enim tincidunt donec quam. A in arcu, hendrerit neque dolor morbi..."
      }
    ]
  };
}

function mergeCommunityPageFromApi(base, apiCp) {
  const b = base && typeof base === "object" ? base : createDefaultCommunityPage();
  if (!apiCp || typeof apiCp !== "object") return b;
  const posts = [0, 1, 2].map((i) => ({
    ...b.posts[i],
    ...(apiCp.posts?.[i] && typeof apiCp.posts[i] === "object" ? apiCp.posts[i] : {})
  }));
  return {
    viewAllHref: apiCp.viewAllHref != null ? String(apiCp.viewAllHref) : b.viewAllHref,
    viewAllLabel: apiCp.viewAllLabel != null ? String(apiCp.viewAllLabel) : b.viewAllLabel,
    posts
  };
}

function mergeSectionVisibilityFromApi(base, apiVis) {
  const out = { ...base };
  if (apiVis && typeof apiVis === "object") {
    for (const k of ORGANIC_HOMEPAGE_BLOCK_KEYS) {
      if (Object.prototype.hasOwnProperty.call(apiVis, k)) {
        out[k] = apiVis[k] !== false;
      }
    }
  }
  return out;
}

function createDefaultSectionHeadings() {
  return {
    gamePrize: {
      title: "เกมและรางวัล",
      titleColor: "#212529",
      subtitle: "สุ่มเกมเผยแพร่จากแพลตฟอร์ม — แตะการ์ดเพื่อเล่น",
      subtitleColor: "#6C757D"
    },
    category: {
      title: "Category",
      titleColor: "#212529",
      subtitle: "",
      subtitleColor: "#6C757D"
    },
    bestSelling: {
      title: "Best selling products",
      titleColor: "#212529",
      subtitle: "",
      subtitleColor: "#6C757D"
    },
    bannerSale1: {
      title: "Items on SALE",
      titleColor: "#FFFFFF",
      subtitle: "Discounts up to 30%",
      subtitleColor: "rgba(255,255,255,0.92)"
    },
    bannerSale2: {
      title: "Combo offers",
      titleColor: "#FFFFFF",
      subtitle: "Discounts up to 50%",
      subtitleColor: "rgba(255,255,255,0.92)"
    },
    bannerSale3: {
      title: "Discount Coupons",
      titleColor: "#FFFFFF",
      subtitle: "Discounts up to 40%",
      subtitleColor: "rgba(255,255,255,0.92)"
    },
    featured: {
      title: "Featured products",
      titleColor: "#212529",
      subtitle: "",
      subtitleColor: "#6C757D"
    },
    newsletter: {
      title: "Get 25% Discount on your first purchase",
      titleColor: "#FFFFFF",
      subtitle: "Just Sign Up & Register it now to become member.",
      subtitleColor: "rgba(255,255,255,0.9)"
    },
    popular: {
      title: "Most popular products",
      titleColor: "#212529",
      subtitle: "",
      subtitleColor: "#6C757D"
    },
    justArrived: {
      title: "Just arrived",
      titleColor: "#212529",
      subtitle: "",
      subtitleColor: "#6C757D"
    },
    blog: {
      title: "เพจชุมชน",
      titleColor: "#212529",
      subtitle: "",
      subtitleColor: "#6C757D"
    },
    appDownload: {
      title: "Download Organic App",
      titleColor: "#212529",
      subtitle: "Online Orders made easy, fast and reliable",
      subtitleColor: "#6C757D"
    },
    seoLooking: {
      title: "People are also looking for",
      titleColor: "#212529",
      subtitle: "",
      subtitleColor: "#6C757D"
    },
    valueTrust: [
      {
        title: "Free delivery",
        titleColor: "#212529",
        subtitle: "Lorem ipsum dolor sit amet, consectetur adipi elit.",
        subtitleColor: "#6C757D"
      },
      {
        title: "100% secure payment",
        titleColor: "#212529",
        subtitle: "Lorem ipsum dolor sit amet, consectetur adipi elit.",
        subtitleColor: "#6C757D"
      },
      {
        title: "Quality guarantee",
        titleColor: "#212529",
        subtitle: "Lorem ipsum dolor sit amet, consectetur adipi elit.",
        subtitleColor: "#6C757D"
      },
      {
        title: "guaranteed savings",
        titleColor: "#212529",
        subtitle: "Lorem ipsum dolor sit amet, consectetur adipi elit.",
        subtitleColor: "#6C757D"
      },
      {
        title: "Daily offers",
        titleColor: "#212529",
        subtitle: "Lorem ipsum dolor sit amet, consectetur adipi elit.",
        subtitleColor: "#6C757D"
      }
    ]
  };
}

function mergeSectionHeadingsFromApi(base, apiSh) {
  if (!apiSh || typeof apiSh !== "object") return base;
  const out = { ...base };
  for (const { key } of ORGANIC_SECTION_HEADING_SIMPLE_KEYS) {
    out[key] = { ...base[key], ...(apiSh[key] || {}) };
  }
  out.valueTrust = [0, 1, 2, 3, 4].map((i) => ({
    ...base.valueTrust[i],
    ...(apiSh.valueTrust?.[i] || {})
  }));
  return out;
}

/** ค่าเริ่มต้นฟอร์มแอดมิน — สอดคล้อง services/organicHomeContent.js */
export function createDefaultOrganicHomeForm() {
  return {
    heroBackgroundImageUrl: "",
    heroTitle: "ยินดีต้อนรับ สู่แพลตฟอร์มหัวใจ",
    heroTitleColor: "#DC3545",
    heroSubtitle: "ยกระดับกิจกรรม และ การโปรโมท ให้โดดเด่นยิ่งขึ้น",
    heroSubtitleColor: "#6C757D",
    primaryCta: {
      label: "เพจชุมชน",
      href: "/page",
      bgColor: "#212529",
      textColor: "#FFFFFF"
    },
    secondaryCta: {
      label: "JOIN NOW",
      href: "/login",
      bgColor: "#198754",
      textColor: "#FFFFFF"
    },
    stats: [
      {
        value: "14k+",
        label: "PRODUCT VARIETIES",
        valueColor: "#212529",
        labelColor: "#212529"
      },
      {
        value: "50k+",
        label: "HAPPY CUSTOMERS",
        valueColor: "#212529",
        labelColor: "#212529"
      },
      {
        value: "10+",
        label: "STORE LOCATIONS",
        valueColor: "#212529",
        labelColor: "#212529"
      }
    ],
    features: [
      {
        icon: "fresh",
        iconImageUrl: "",
        title: "Fresh from farm",
        description: "Lorem ipsum dolor sit amet, consectetur adipi elit.",
        cardBgColor: "#0D6EFD",
        titleColor: "#FFFFFF",
        descriptionColor: "rgba(255,255,255,0.92)"
      },
      {
        icon: "organic",
        iconImageUrl: "",
        title: "100% Organic",
        description: "Lorem ipsum dolor sit amet, consectetur adipi elit.",
        cardBgColor: "#6C757D",
        titleColor: "#FFFFFF",
        descriptionColor: "rgba(255,255,255,0.92)"
      },
      {
        icon: "delivery",
        iconImageUrl: "",
        title: "Free delivery",
        description: "Lorem ipsum dolor sit amet, consectetur adipi elit.",
        cardBgColor: "#DC3545",
        titleColor: "#FFFFFF",
        descriptionColor: "rgba(255,255,255,0.92)"
      }
    ],
    sectionHeadings: createDefaultSectionHeadings(),
    sectionVisibility: createDefaultSectionVisibility(),
    communityPage: createDefaultCommunityPage()
  };
}

/** รวมค่าจาก API กับค่าเริ่มต้น (รองรับ partial) */
export function mergeOrganicHomeFromApi(api) {
  const d = createDefaultOrganicHomeForm();
  if (!api || typeof api !== "object") return d;
  return {
    ...d,
    ...api,
    primaryCta: { ...d.primaryCta, ...(api.primaryCta || {}) },
    secondaryCta: { ...d.secondaryCta, ...(api.secondaryCta || {}) },
    stats: [0, 1, 2].map((i) => ({ ...d.stats[i], ...(api.stats?.[i] || {}) })),
    features: [0, 1, 2].map((i) => ({ ...d.features[i], ...(api.features?.[i] || {}) })),
    sectionHeadings: mergeSectionHeadingsFromApi(d.sectionHeadings, api.sectionHeadings),
    sectionVisibility: mergeSectionVisibilityFromApi(d.sectionVisibility, api.sectionVisibility),
    communityPage: mergeCommunityPageFromApi(d.communityPage, api.communityPage)
  };
}
