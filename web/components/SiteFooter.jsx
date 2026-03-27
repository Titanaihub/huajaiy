import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
      <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-4 px-4">
        <Link href="/privacy" className="underline hover:text-slate-700">
          นโยบายความเป็นส่วนตัว
        </Link>
        <Link href="/terms" className="underline hover:text-slate-700">
          ข้อกำหนดการให้บริการ
        </Link>
        <Link href="/data-deletion" className="underline hover:text-slate-700">
          การลบข้อมูล
        </Link>
      </div>
      <p className="mt-3">© HUAJAIY</p>
    </footer>
  );
}
