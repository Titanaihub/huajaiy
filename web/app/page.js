import Link from "next/link";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import UploadForm from "../components/UploadForm";

const actions = [
  {
    href: "/shop",
    title: "ร้านค้า",
    desc: "ดูสินค้าตัวอย่างและแต้มหัวใจ",
    accent: "border-brand-200 bg-brand-50/80"
  },
  {
    href: "/cart",
    title: "ตะกร้า",
    desc: "จัดการรายการและยืนยันออเดอร์สาธิต",
    accent: "border-slate-200 bg-white"
  },
  {
    href: "/game",
    title: "เกมเปิดป้าย",
    desc: "ทดสอบกติกาสะสมครบก่อนชนะ",
    accent: "border-slate-200 bg-white"
  },
  {
    href: "/contact",
    title: "ติดต่อ",
    desc: "ส่งข้อความถึงทีมงาน",
    accent: "border-slate-200 bg-white"
  }
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 md:pt-12">
        <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-8 shadow-soft md:p-10">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-brand-100/90 to-teal-50 blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-800">
              ยินดีต้อนรับ
            </p>
            <h1 className="mt-2 text-2xl font-bold leading-tight text-slate-900 md:text-3xl">
              แพลตฟอร์มเบา โหลดไว
              <span className="block text-lg font-semibold text-slate-600 md:mt-1 md:inline md:text-xl">
                {" "}
                อัปโหลดรูปได้ทันที ไม่ต้องล็อกอิน
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base">
              ใช้งานผ่านเบราว์เซอร์ — ร้านค้า เกม และเครื่องมืออัปโหลดในที่เดียว
              พร้อมขยายต่อยอดเมื่อคุณพร้อมเปิดให้บริการจริง
            </p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold text-slate-900">ทางลัด</h2>
          <p className="mt-1 text-xs text-slate-500">เลือกบริการที่ต้องการ</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {actions.map((a) => (
              <li key={a.href}>
                <Link
                  href={a.href}
                  className={`flex h-full flex-col rounded-xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${a.accent}`}
                >
                  <span className="font-semibold text-slate-900">{a.title}</span>
                  <span className="mt-1 text-sm text-slate-600">{a.desc}</span>
                  <span className="mt-3 text-xs font-medium text-brand-700">
                    ไปที่หน้า →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <UploadForm />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
