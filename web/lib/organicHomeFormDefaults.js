/** ค่าเริ่มต้นฟอร์มแอดมิน — สอดคล้อง services/organicHomeContent.js */
export function createDefaultOrganicHomeForm() {
  return {
    heroBackgroundImageUrl: "",
    heroTitle: "ยินดีต้อนรับ สู่แพลตฟอร์มหัวใจ",
    heroTitleColor: "#DC3545",
    heroSubtitle: "ยกระดับกิจกรรม และ การโปรโมท ให้โดดเด่นยิ่งขึ้น",
    heroSubtitleColor: "#6C757D",
    primaryCta: {
      label: "START SHOPPING",
      href: "/shop",
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
        title: "Fresh from farm",
        description: "Lorem ipsum dolor sit amet, consectetur adipi elit.",
        cardBgColor: "#0D6EFD",
        titleColor: "#FFFFFF",
        descriptionColor: "rgba(255,255,255,0.92)"
      },
      {
        icon: "organic",
        title: "100% Organic",
        description: "Lorem ipsum dolor sit amet, consectetur adipi elit.",
        cardBgColor: "#6C757D",
        titleColor: "#FFFFFF",
        descriptionColor: "rgba(255,255,255,0.92)"
      },
      {
        icon: "delivery",
        title: "Free delivery",
        description: "Lorem ipsum dolor sit amet, consectetur adipi elit.",
        cardBgColor: "#DC3545",
        titleColor: "#FFFFFF",
        descriptionColor: "rgba(255,255,255,0.92)"
      }
    ]
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
    features: [0, 1, 2].map((i) => ({ ...d.features[i], ...(api.features?.[i] || {}) }))
  };
}
