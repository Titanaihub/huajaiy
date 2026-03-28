import Link from "next/link";
import ApiHealthStrip from "../components/ApiHealthStrip";
import SectionHeading from "../components/SectionHeading";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import UploadForm from "../components/UploadForm";

const actions = [
  {
    href: "/shop",
    title: "ร้านค้า",
    desc: "ดูสินค้าตัวอย่างและแต้มหัวใจ",
    accent:
      "border-white/80 bg-gradient-to-br from-white/88 via-rose-50/75 to-pink-100/50 shadow-game-sm backdrop-blur-md"
  },
  {
    href: "/cart",
    title: "ตะกร้า",
    desc: "จัดการรายการและยืนยันออเดอร์สาธิต",
    accent: "border-white/75 bg-white/78 shadow-game-sm backdrop-blur-md"
  },
  {
    href: "/game",
    title: "เกมเปิดป้าย",
    desc: "ทดสอบกติกาสะสมครบก่อนชนะ",
    accent: "border-white/75 bg-white/78 shadow-game-sm backdrop-blur-md"
  },
  {
    href: "/contact",
    title: "ติดต่อ",
    desc: "ส่งข้อความถึงทีมงาน",
    accent: "border-white/75 bg-white/78 shadow-game-sm backdrop-blur-md"
  },
  {
    href: "/auth",
    title: "Facebook · LINE",
    desc: "เข้าด้วยบัญชีโซเชียล (NextAuth) — ยูส/รหัสผ่านที่ล็อกอิน/สมัคร",
    accent: "border-white/75 bg-white/78 shadow-game-sm backdrop-blur-md"
  }
];

const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-rose-600 to-red-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_6px_20px_-4px_rgb(225_29_72/0.55)] transition hover:from-rose-700 hover:to-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white/90";

const btnSecondary =
  "inline-flex items-center justify-center rounded-xl border border-white/80 bg-white/90 px-5 py-2.5 text-sm font-bold text-rose-800 shadow-game-sm backdrop-blur-sm transition hover:border-rose-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8 md:pt-12">
        <section className="surface-game-hero relative overflow-hidden p-8 md:p-10 lg:p-12">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-pink-300/45 via-rose-200/35 to-transparent blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-12 -left-10 h-44 w-44 rounded-full bg-rose-400/25 blur-3xl"
            aria-hidden
          />
          <div className="relative max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-rose-700">
              ยินดีต้อนรับ
            </p>
            <h1 className="mt-3 text-3xl font-extrabold leading-[1.12] tracking-tight text-slate-900 drop-shadow-sm md:text-4xl">
              แพลตฟอร์มเบา โหลดไว
            </h1>
            <p className="mt-2 text-lg font-bold text-slate-700 md:text-xl">
              อัปโหลดรูปได้ทันที ไม่ต้องล็อกอิน
            </p>
            <p className="mt-5 text-sm leading-relaxed text-slate-600 md:text-base">
              ใช้งานผ่านเบราว์เซอร์ — ร้านค้า เกม และเครื่องมืออัปโหลดในที่เดียว
              พร้อมขยายต่อยอดเมื่อคุณพร้อมเปิดให้บริการจริง
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className={btnPrimary}>
                เข้าร้านค้า
              </Link>
              <Link href="#upload" className={btnSecondary}>
                เลื่อนไปอัปโหลดรูป
              </Link>
            </div>
            <ApiHealthStrip />
          </div>
        </section>

        <section className="mt-14 md:mt-16" aria-labelledby="shortcuts-heading">
          <SectionHeading
            id="shortcuts-heading"
            eyebrow="เมนูหลัก"
            title="ทางลัด"
            subtitle="เลือกบริการที่ต้องการ — แตะการ์ดเพื่อไปหน้านั้นทันที"
          />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {actions.map((a) => (
              <li key={a.href}>
                <Link
                  href={a.href}
                  className={`group flex h-full min-h-[8.5rem] flex-col rounded-2xl border p-5 transition duration-200 hover:-translate-y-1 hover:border-rose-200/90 hover:shadow-game focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${a.accent}`}
                >
                  <span className="font-semibold text-slate-900 group-hover:text-brand-900">
                    {a.title}
                  </span>
                  <span className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                    {a.desc}
                  </span>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                    ไปที่หน้า
                    <span
                      className="transition group-hover:translate-x-0.5"
                      aria-hidden
                    >
                      →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="mt-14 md:mt-16"
          aria-labelledby="upload-heading"
        >
          <SectionHeading
            id="upload-heading"
            eyebrow="เครื่องมือ"
            title="อัปโหลดรูป"
            subtitle="บีบอัดอัตโนมัติก่อนส่งขึ้นคลาวด์ — ไม่ต้องล็อกอิน"
          />
          <div className="mt-8">
            <UploadForm showCardHeader={false} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
