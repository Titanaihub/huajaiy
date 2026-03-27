import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import UploadForm from "../components/UploadForm";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <p className="mb-4 text-sm text-slate-600">
          แพลตฟอร์มเบา โหลดไว — พร้อมต่อยอดร้านค้าและเกมเปิดป้าย (พัฒนาต่อได้ทีละส่วน)
        </p>
        <UploadForm />
      </main>
      <SiteFooter />
    </>
  );
}
