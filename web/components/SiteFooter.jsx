import Link from "next/link";
import { siteNavLinkClass } from "../lib/siteNavLinkClass";
import BrandLogo from "./BrandLogo";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-hui-border bg-gradient-to-b from-hui-surface via-hui-pageMid to-hui-pageBot">
      <div className="mx-auto max-w-5xl px-4 py-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
        <p className="mt-5 border-t border-hui-border pt-4 text-center text-sm text-hui-body">
          © {new Date().getFullYear()} HUAJAIY — สงวนลิขสิทธิ์
        </p>
      </div>
    </footer>
  );
}
