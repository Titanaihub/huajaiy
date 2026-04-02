import Link from "next/link";
import { siteNavLinkClass } from "../lib/siteNavLinkClass";
import BrandLogo from "./BrandLogo";
import HeartsBadge from "./HeartsBadge";
import MemberNav from "./MemberNav";

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
          <Link href="/" className={siteNavLinkClass}>
            Workspace
          </Link>
          <Link href="/hui" className={siteNavLinkClass}>
            แพลตฟอร์มเดิม
          </Link>
          <Link href="/game" className={siteNavLinkClass}>
            เกม
          </Link>
          <span className="hidden h-4 w-px bg-hui-border/35 sm:inline-block" />
          <MemberNav />
        </nav>
      </div>
    </header>
  );
}
