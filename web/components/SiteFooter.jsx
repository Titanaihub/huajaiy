import Link from "next/link";
import BrandLogo from "./BrandLogo";

const linkClass =
  "text-rose-100/90 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-300";

export default function SiteFooter() {
  return (
    <footer className="relative mt-16 overflow-hidden border-t border-white/25 bg-gradient-to-br from-rose-600 via-rose-500 to-pink-400 shadow-[0_-12px_40px_-16px_rgb(225_29_72/0.35)]">
      <div
        className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-white/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-red-500/30 blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <BrandLogo variant="footer" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-rose-50/90">
              แพลตฟอร์มร้านค้า เกม และการอัปโหลดสื่อ — ออกแบบให้ใช้งานบนมือถือได้สะดวก
            </p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
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
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-200/90">
                บริการ
              </span>
              <Link href="/" className={linkClass}>
                หน้าแรก
              </Link>
              <Link href="/shop" className={linkClass}>
                ร้านค้า
              </Link>
              <Link href="/cart" className={linkClass}>
                ตะกร้า
              </Link>
              <Link href="/game" className={linkClass}>
                เกม
              </Link>
              <Link href="/contact" className={linkClass}>
                ติดต่อ
              </Link>
              <Link href="/orders" className={linkClass}>
                ประวัติออเดอร์ (สาธิต)
              </Link>
            </div>
          </div>
        </div>
        <p className="mt-10 border-t border-white/20 pt-6 text-center text-xs text-rose-100/80">
          © {new Date().getFullYear()} HUAJAIY — สงวนลิขสิทธิ์
        </p>
      </div>
    </footer>
  );
}
