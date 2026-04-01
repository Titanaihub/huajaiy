import Link from "next/link";
import BrandLogo from "./BrandLogo";

const linkClass =
  "text-hui-section transition hover:text-hui-cta focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hui-cta";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-hui-border bg-gradient-to-b from-hui-surface via-hui-pageMid to-hui-pageBot">
      <div className="mx-auto max-w-5xl px-4 py-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <BrandLogo variant="footer" />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-hui-muted">
              กฎหมาย
            </span>
            <Link href="/privacy" className={linkClass}>
              นโยบายความเป็นส่วนตัว
            </Link>
            <Link href="/terms" className={linkClass}>
              ข้อกำหนดการให้บริการ
            </Link>
            <Link href="/data-deletion" className={linkClass}>
              การลบข้อมูล
            </Link>
          </div>
        </div>
        <p className="mt-5 border-t border-hui-border pt-4 text-center text-xs text-hui-muted">
          © {new Date().getFullYear()} HUAJAIY — สงวนลิขสิทธิ์
        </p>
      </div>
    </footer>
  );
}
