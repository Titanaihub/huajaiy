import Link from "next/link";
import BrandLogo from "./BrandLogo";
import CartBadge from "./CartBadge";
import HeartsBadge from "./HeartsBadge";
import MemberNav from "./MemberNav";

const navClass =
  "shrink-0 whitespace-nowrap rounded-md px-1 py-0.5 text-sm font-semibold text-slate-700 transition hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white/80";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/72 shadow-game-sm backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <BrandLogo />
          <div className="flex items-center gap-2 border-l border-rose-200/70 pl-2 sm:pl-3">
            <HeartsBadge />
            <CartBadge />
          </div>
        </div>
        <nav
          className="scrollbar-hide -mx-4 flex max-w-full items-center gap-x-1 gap-y-2 overflow-x-auto px-4 pb-0.5 text-sm sm:mx-0 sm:flex-wrap sm:justify-end sm:overflow-visible sm:px-0 sm:pb-0"
          aria-label="เมนูหลัก"
        >
          <Link href="/" className={navClass}>
            หน้าแรก
          </Link>
          <Link href="/shop" className={navClass}>
            ร้านค้า
          </Link>
          <Link href="/cart" className={navClass}>
            ตะกร้า
          </Link>
          <Link href="/orders" className={navClass}>
            ออเดอร์
          </Link>
          <Link href="/game" className={navClass}>
            เกม
          </Link>
          <Link href="/contact" className={navClass}>
            ติดต่อ
          </Link>
          <Link
            href="/auth"
            className={navClass}
            title="เข้าด้วย Facebook หรือ LINE (NextAuth)"
          >
            FB · LINE
          </Link>
          <span className="hidden h-4 w-px bg-rose-200/80 sm:inline-block" />
          <MemberNav />
        </nav>
      </div>
    </header>
  );
}
