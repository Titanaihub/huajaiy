import Link from "next/link";
import BrandLogo from "./BrandLogo";
import HeartsBadge from "./HeartsBadge";
import MemberNav from "./MemberNav";

const navClass =
  "shrink-0 whitespace-nowrap rounded-xl px-2 py-1 text-sm font-medium text-hui-section transition hover:bg-hui-border/40 hover:text-hui-burgundy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hui-cta/40 focus-visible:ring-offset-2";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-hui-border bg-hui-surface/95 shadow-soft backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <BrandLogo />
          <div className="flex items-center gap-2 border-l border-hui-border pl-2 sm:pl-3">
            <HeartsBadge />
          </div>
        </div>
        <nav
          className="scrollbar-hide -mx-4 flex max-w-full items-center gap-x-1 gap-y-2 overflow-x-auto px-4 pb-0.5 text-sm sm:mx-0 sm:flex-wrap sm:justify-end sm:overflow-visible sm:px-0 sm:pb-0"
          aria-label="เมนูหลัก"
        >
          <Link href="/" className={navClass}>
            หน้าแรก
          </Link>
          <Link href="/game" className={navClass}>
            เกม
          </Link>
          <span className="hidden h-4 w-px bg-slate-200 sm:inline-block" />
          <MemberNav />
        </nav>
      </div>
    </header>
  );
}
