"use client";

import Link from "next/link";
import { buildSiteFooterOverlayStyle } from "../lib/siteThemeStyle";
import { siteNavLinkClass } from "../lib/siteNavLinkClass";
import BrandLogo from "./BrandLogo";
import { useSiteTheme } from "./SiteThemeProvider";

const THEME_FALLBACK = {
  backgroundImageUrl: "",
  bgGradientTop: "#FFF5F8",
  bgGradientMid: "#FFEEF3",
  bgGradientBottom: "#FFD6E2",
  innerBackgroundImageUrl: "",
  innerBgGradientTop: "#FFF5F8",
  innerBgGradientMid: "#FFEEF3",
  innerBgGradientBottom: "#FFD6E2",
  footerScrimHex: "#2B121C",
  footerScrimPercent: 48
};

export default function SiteFooter() {
  const ctx = useSiteTheme();
  const theme = ctx && typeof ctx === "object" ? { ...THEME_FALLBACK, ...ctx } : THEME_FALLBACK;
  const footerOverlay = buildSiteFooterOverlayStyle(theme);

  return (
    <footer
      className="mt-12 border-t border-black/10"
      style={footerOverlay}
    >
      <div className="mx-auto max-w-5xl px-4 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <BrandLogo variant="footer" />
          <div className="flex flex-wrap items-center gap-x-1 gap-y-1 sm:gap-x-2">
            <span className="px-2 py-1 text-sm font-semibold text-hui-section">
              กฎหมาย
            </span>
            <span className="hidden text-hui-border sm:inline" aria-hidden>
              ·
            </span>
            <Link href="/privacy" className={siteNavLinkClass}>
              นโยบายความเป็นส่วนตัว
            </Link>
            <Link href="/terms" className={siteNavLinkClass}>
              ข้อกำหนดการให้บริการ
            </Link>
            <Link href="/data-deletion" className={siteNavLinkClass}>
              การลบข้อมูล
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
