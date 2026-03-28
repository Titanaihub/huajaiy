import Link from "next/link";
import ApiHealthStrip from "../components/ApiHealthStrip";
import SectionHeading from "../components/SectionHeading";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import UploadForm from "../components/UploadForm";
import { fetchPublicCentralGameMeta } from "../lib/publicGameMeta";

const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-brand-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2";

const btnSecondary =
  "inline-flex items-center justify-center rounded-xl border border-brand-300 bg-white px-5 py-2.5 text-sm font-semibold text-brand-900 shadow-sm transition hover:border-brand-400 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2";

function buildActions(centralMeta) {
  return [
    {
      href: "/shop",
      title: "ร้านค้า",
      desc: "ดูสินค้าตัวอย่างและแต้มหัวใจ",
      accent: "border-brand-200/90 bg-gradient-to-br from-brand-50/90 to-white"
    },
    {
      href: "/cart",
      title: "ตะกร้า",
      desc: "จัดการรายการและยืนยันออเดอร์สาธิต",
      accent: "border-slate-200/90 bg-white"
    },
    {
      href: "/game",
      title: centralMeta ? centralMeta.title : "เกมเปิดป้าย",
      desc: centralMeta
        ? `เผยแพร่แล้ว · ${centralMeta.cardCount} ป้าย — แตะเพื่อเล่นเกมส่วนกลาง`
        : "ทดสอบกติกาสะสมครบก่อนชนะ",
      accent: centralMeta
        ? "border-brand-300/90 bg-gradient-to-br from-brand-50 to-white ring-1 ring-brand-200/70"
        : "border-slate-200/90 bg-white",
      badge: centralMeta ? "เผยแพร่" : null
    },
    {
      href: "/contact",
      title: "ติดต่อ",
      desc: "ส่งข้อความถึงทีมงาน",
      accent: "border-slate-200/90 bg-white"
    },
    {
      href: "/auth",
      title: "Facebook · LINE",
      desc: "เข้าด้วยบัญชีโซเชียล (NextAuth) — ยูส/รหัสผ่านที่ล็อกอิน/สมัคร",
      accent: "border-slate-200/90 bg-white"
    }
  ];
}

export default async function HomePage() {
  const centralMeta = await fetchPublicCentralGameMeta();
  const actions = buildActions(centralMeta);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8 md:pt-12">
        <section className="relative overflow-hidden rounded-3xl border border-brand-100/90 bg-white p-8 shadow-soft md:p-10 lg:p-12">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-brand-200/50 via-brand-100/60 to-transparent blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-brand-50/80 blur-2xl"
            aria-hidden
          />
          <div className="relative max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-800">
              ยินดีต้อนรับ
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-[1.15] tracking-tight text-slate-900 md:text-4xl">
              แพลตฟอร์มเบา โหลดไว
            </h1>
            <p className="mt-2 text-lg font-semibold text-slate-600 md:text-xl">
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

        {centralMeta ? (
          <section className="mt-14 md:mt-16" aria-labelledby="game-published-heading">
            <SectionHeading
              id="game-published-heading"
              eyebrow="เกม"
              title={centralMeta.title}
              subtitle="เผยแพร่แล้วบนเว็บ — เล่นได้จากปุ่มด้านล่างหรือเมนู「เกม」"
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/game" className={btnPrimary}>
                เข้าเล่น「{centralMeta.title}」
              </Link>
              <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-900">
                {centralMeta.cardCount} ป้าย
              </span>
            </div>
          </section>
        ) : null}

        <section className="mt-14 md:mt-16" aria-labelledby="shortcuts-heading">
          <SectionHeading
            id="shortcuts-heading"
            eyebrow="เมนูหลัก"
            title="ทางลัด"
            subtitle={
              centralMeta
                ? "รวมลิงก์บริการ — การ์ดเกมแสดงชื่อเกมที่เผยแพร่"
                : "เลือกบริการที่ต้องการ — แตะการ์ดเพื่อไปหน้านั้นทันที"
            }
          />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {actions.map((a) => (
              <li key={a.href}>
                <Link
                  href={a.href}
                  className={`group flex h-full min-h-[8.5rem] flex-col rounded-2xl border p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 ${a.accent}`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-900 group-hover:text-brand-900">
                      {a.title}
                    </span>
                    {a.badge ? (
                      <span className="shrink-0 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        {a.badge}
                      </span>
                    ) : null}
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
