"use client";

import Link from "next/link";

const categories = [
  { label: "ผักผลไม้สด", emoji: "🥬" },
  { label: "ของชำ", emoji: "🧺" },
  { label: "เครื่องดื่ม", emoji: "🥤" },
  { label: "ของใช้ในบ้าน", emoji: "🏠" },
  { label: "สุขภาพ", emoji: "💊" },
  { label: "ของรางวัล", emoji: "🎁" }
];

const deals = [
  {
    title: "แคมเปญหัวใจ x สินค้าขายดี",
    desc: "โซนโปรโมชันที่หยิบแรงบันดาลใจจาก Organic template แล้วปรับให้เข้ากับโทน HUAJAIY",
    cta: "ดูตัวอย่างแคมเปญ"
  },
  {
    title: "เกมสุ่มรางวัลประจำสัปดาห์",
    desc: "ใช้การ์ดใหญ่ + badge + gradient เพื่อดึงสายตาในช่วงโปรโมท",
    cta: "เปิดหน้าจัดเกม"
  },
  {
    title: "บัญชีสมาชิกและออเดอร์",
    desc: "ลดความแน่นของข้อมูลด้วย card spacing, heading scale และ action ที่ชัดขึ้น",
    cta: "เปิดหน้าบัญชี"
  }
];

const products = [
  { name: "ชุดของขวัญสุขใจ", price: "฿390", tag: "ใหม่" },
  { name: "คูปองหัวใจพิเศษ", price: "฿99", tag: "ฮิต" },
  { name: "กล่องสุ่มรางวัล", price: "฿149", tag: "แนะนำ" },
  { name: "แพ็กสะสมแต้ม", price: "฿259", tag: "คุ้มค่า" }
];

export default function ThemeLabOrganic() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 md:pt-10">
      <section className="relative overflow-hidden rounded-3xl border border-hui-border bg-white p-6 shadow-soft md:p-10">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-rose-200/80 to-transparent blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-gradient-to-tr from-hui-pageMid/80 to-transparent blur-2xl"
          aria-hidden
        />
        <div className="relative">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-hui-muted">
            Theme Lab
          </p>
          <h1 className="mt-2 text-3xl font-bold text-hui-burgundy md:text-4xl">
            Organic Template → HUAJAIY Style
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-hui-body">
            หน้านี้เป็น sandbox สำหรับลองงานตกแต่งก่อนใช้งานจริง โดยหยิบ mood และ layout
            จากเทมเพลตสำเร็จรูป แล้วแปลงเป็นคอมโพเนนต์ Next.js/Tailwind ที่เข้ากับระบบเดิมของเรา
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/page" className="hui-btn-primary">
              ไปเพจชุมชน
            </Link>
            <Link
              href="/theme-lab/original"
              className="rounded-2xl border border-hui-border bg-white px-5 py-2.5 text-sm font-semibold text-hui-section hover:bg-hui-pageTop"
            >
              Organic ต้นฉบับ (เต็มจอ)
            </Link>
            <Link
              href="/theme-lab/purdue"
              className="rounded-2xl border border-hui-border bg-white px-5 py-2.5 text-sm font-semibold text-hui-section hover:bg-hui-pageTop"
            >
              Purdue ต้นฉบับ (เต็มจอ)
            </Link>
            <Link
              href="/member"
              className="rounded-2xl border border-hui-border bg-white px-5 py-2.5 text-sm font-semibold text-hui-section hover:bg-hui-pageTop"
            >
              TailAdmin Vue (หลังบ้าน)
            </Link>
            <Link
              href="/theme-lab/dashui"
              className="rounded-2xl border border-hui-border bg-white px-5 py-2.5 text-sm font-semibold text-hui-section hover:bg-hui-pageTop"
            >
              DashUI Next (หลังบ้าน)
            </Link>
            <a
              href="/purdue-template/sitemap.html"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-hui-border bg-hui-surface px-5 py-2.5 text-sm font-semibold text-hui-section hover:bg-white"
            >
              Purdue — รายการทุกหน้า
            </a>
            <Link
              href="/admin"
              className="rounded-2xl border border-hui-border bg-hui-surface px-5 py-2.5 text-sm font-semibold text-hui-section hover:bg-white"
            >
              กลับหลังบ้าน
            </Link>
          </div>
          <p className="mt-4 max-w-3xl text-sm text-hui-muted">
            เทมเพลตหลังบ้าน <strong>TailAdmin (Vue)</strong> และ <strong>DashUI (Next.js)</strong> แสดงใน iframe
            หลัง build และคัดลอกเข้า <code className="rounded bg-hui-pageTop px-1 text-xs">web/public</code> — จากโฟลเดอร์{" "}
            <code className="rounded bg-hui-pageTop px-1 text-xs">web</code> รัน{" "}
            <code className="rounded bg-hui-pageTop px-1 text-xs">npm run demo:admin-themes</code> (ต้องมี Node.js)
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="hui-h3">หมวดเดโมไอคอน/ชิป</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <article
              key={c.label}
              className="group rounded-2xl border border-hui-border bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-hui-cta/30 hover:shadow"
            >
              <p className="text-lg">
                <span aria-hidden>{c.emoji}</span>{" "}
                <span className="font-semibold text-hui-section">{c.label}</span>
              </p>
              <p className="mt-1 text-sm text-hui-muted">
                โครงแบบ category tile ที่อ่านง่ายบนมือถือ
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-3">
        {deals.map((deal, i) => (
          <article
            key={deal.title}
            className={`rounded-2xl border p-5 shadow-sm ${
              i === 0
                ? "border-hui-cta/25 bg-gradient-to-br from-hui-pageTop to-white"
                : "border-hui-border bg-white"
            }`}
          >
            <h3 className="text-lg font-semibold text-hui-section">{deal.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-hui-body">{deal.desc}</p>
            <button
              type="button"
              className="mt-4 rounded-xl border border-hui-border px-3 py-1.5 text-sm font-semibold text-hui-section hover:bg-hui-pageTop"
            >
              {deal.cta}
            </button>
          </article>
        ))}
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="hui-h3">การ์ดสินค้าแนวเทมเพลต</h2>
          <span className="rounded-full bg-hui-pageTop px-3 py-1 text-xs font-semibold text-hui-muted">
            ทดลอง spacing / hierarchy
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {products.map((p) => (
            <article
              key={p.name}
              className="overflow-hidden rounded-2xl border border-hui-border bg-white shadow-sm"
            >
              <div className="h-36 bg-gradient-to-br from-rose-100 via-white to-hui-pageMid" />
              <div className="space-y-2 p-4">
                <span className="inline-flex rounded-full bg-hui-pageTop px-2 py-0.5 text-xs font-semibold text-hui-section">
                  {p.tag}
                </span>
                <h3 className="text-base font-semibold text-hui-section">{p.name}</h3>
                <p className="text-sm text-hui-muted">ปรับจาก card style ของ Organic template</p>
                <div className="flex items-center justify-between pt-1">
                  <p className="text-lg font-bold text-hui-cta">{p.price}</p>
                  <button
                    type="button"
                    className="rounded-xl border border-hui-border px-3 py-1.5 text-sm font-semibold text-hui-section hover:bg-hui-pageTop"
                  >
                    เพิ่ม
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
