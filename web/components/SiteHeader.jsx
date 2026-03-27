import Link from "next/link";
import CartBadge from "./CartBadge";
import HeartsBadge from "./HeartsBadge";
import MemberNav from "./MemberNav";

const navClass =
  "text-sm font-medium text-slate-600 transition hover:text-brand-800";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link href="/" className="group flex flex-col leading-tight">
            <span className="text-lg font-bold tracking-tight text-slate-900 transition group-hover:text-brand-800">
              HUAJAIY
            </span>
            <span className="hidden text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500 sm:block">
              Commerce · Game · Media
            </span>
          </Link>
          <div className="flex items-center gap-2 border-l border-slate-200 pl-2 sm:pl-3">
            <HeartsBadge />
            <CartBadge />
          </div>
        </div>
        <nav className="flex max-w-full flex-wrap items-center gap-x-3 gap-y-2 text-sm sm:justify-end">
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
          <Link href="/auth" className={navClass}>
            โซเชียล
          </Link>
          <span className="hidden h-4 w-px bg-slate-200 sm:inline-block" />
          <MemberNav />
        </nav>
      </div>
    </header>
  );
}
