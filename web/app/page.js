import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import UploadForm from "../components/UploadForm";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <p className="mb-3 text-sm text-slate-600">
          แพลตฟอร์มเบา โหลดไว — อัปโหลดรูปได้ทันที ไม่ต้องล็อกอิน
        </p>
        <div className="mb-6 flex flex-wrap gap-2 text-sm">
          <Link
            href="/shop"
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-slate-800 hover:bg-slate-50"
          >
            ไปร้านค้า (ตัวอย่าง)
          </Link>
          <Link
            href="/game"
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-slate-800 hover:bg-slate-50"
          >
            ไปเกมเปิดป้าย (สาธิต)
          </Link>
        </div>
        <UploadForm />
      </main>
      <SiteFooter />
    </>
  );
}
