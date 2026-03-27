import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link href="/" className="text-lg font-semibold text-slate-900">
          HUAJAIY
        </Link>
        <nav className="flex flex-wrap gap-3 text-sm text-slate-600">
          <Link href="/" className="hover:text-slate-900">
            หน้าแรก
          </Link>
          <Link href="/shop" className="hover:text-slate-900">
            ร้านค้า
          </Link>
          <Link href="/game" className="hover:text-slate-900">
            เกม
          </Link>
          <Link href="/auth" className="hover:text-slate-900">
            เข้าสู่ระบบ
          </Link>
        </nav>
      </div>
    </header>
  );
}
