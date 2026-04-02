import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";

export const metadata = {
  title: "Theme Lab Original | HUAJAIY",
  description: "ดูเทมเพลต Organic ต้นฉบับแบบเต็มหน้า"
};

export default function ThemeLabOriginalPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 pb-14 pt-8">
        <div className="mb-4 rounded-2xl border border-hui-border bg-white p-4 shadow-sm">
          <h1 className="hui-h3">Organic Template (ต้นฉบับ)</h1>
          <p className="mt-2 text-sm text-hui-muted">
            หน้านี้แสดงเทมเพลตเดิมเต็มชุด เพื่อใช้เปรียบเทียบและเลือกส่วนที่จะนำมาปรับกับ HUAJAIY
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-hui-border bg-white shadow-soft">
          <iframe
            title="Organic template original"
            src="/organic-template/index.html"
            className="h-[85vh] w-full"
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
