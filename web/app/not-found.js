import Link from "next/link";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-800">
          404
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">ไม่พบหน้านี้</h1>
        <p className="mt-2 text-sm text-slate-600">
          ลิงก์อาจพิมพ์ผิด หรือหน้าถูกย้ายแล้ว
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
        >
          กลับหน้าแรก
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
