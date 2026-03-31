import Link from "next/link";
import BrandLogo from "./BrandLogo";

const linkClass =
  "text-rose-100/90 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-rose-300/70 bg-gradient-to-b from-[#FF7A63] to-[#F05A67]">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <BrandLogo variant="footer" />
          <div className="flex flex-col gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-50/90">
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
        <p className="mt-10 border-t border-rose-200/60 pt-6 text-center text-xs text-rose-50/90">
          © {new Date().getFullYear()} HUAJAIY — สงวนลิขสิทธิ์
        </p>
      </div>
    </footer>
  );
}
