import Link from "next/link";
import BrandLogo from "./BrandLogo";

const linkClass =
  "text-slate-400 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-rose-900/80 bg-rose-950">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <BrandLogo variant="footer" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
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
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                บริการ
              </span>
              <Link href="/contact" className={linkClass}>
                ติดต่อ
              </Link>
              <Link href="/orders" className={linkClass}>
                ประวัติออเดอร์ (สาธิต)
              </Link>
            </div>
          </div>
        </div>
        <p className="mt-10 border-t border-rose-900/60 pt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} HUAJAIY — สงวนลิขสิทธิ์
        </p>
      </div>
    </footer>
  );
}
