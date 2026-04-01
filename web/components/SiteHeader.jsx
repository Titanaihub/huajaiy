"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "./BrandLogo";
import HeartsBadge from "./HeartsBadge";
import MemberNav from "./MemberNav";

function gameSectionPath(pathname) {
  return pathname === "/game" || pathname.startsWith("/game/");
}

export default function SiteHeader() {
  const pathname = usePathname() || "";
  const onBrand = gameSectionPath(pathname);

  const navClass = onBrand
    ? "shrink-0 whitespace-nowrap rounded-md px-1 py-0.5 text-sm font-medium text-white transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#E63946]"
    : "shrink-0 whitespace-nowrap rounded-md px-1 py-0.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2";

  return (
    <header
      className={
        onBrand
          ? "sticky top-0 z-50 border-b border-white/20 bg-[#E63946]/92 shadow-sm backdrop-blur-md"
          : "sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm"
      }
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <BrandLogo onBrand={onBrand} />
          <div
            className={
              onBrand
                ? "flex items-center gap-2 border-l border-white/30 pl-2 sm:pl-3"
                : "flex items-center gap-2 border-l border-slate-200 pl-2 sm:pl-3"
            }
          >
            <HeartsBadge onBrand={onBrand} />
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
          <span
            className={
              onBrand
                ? "hidden h-4 w-px bg-white/35 sm:inline-block"
                : "hidden h-4 w-px bg-slate-200 sm:inline-block"
            }
          />
          <MemberNav onBrand={onBrand} />
        </nav>
      </div>
    </header>
  );
}
