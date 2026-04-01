import Link from "next/link";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-hui-burgundy">
          404
        </p>
        <h1 className="mt-2 text-2xl font-bold text-hui-section">ไม่พบหน้านี้</h1>
        <p className="mt-2 text-sm text-hui-muted">
          ลิงก์อาจพิมพ์ผิด หรือหน้าถูกย้ายแล้ว
        </p>
        <Link href="/" className="hui-btn-primary mt-8 inline-block px-5 py-2.5 text-sm">
          กลับหน้าแรก
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
