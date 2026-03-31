import Link from "next/link";
import ApiHealthStrip from "../components/ApiHealthStrip";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { DEFAULT_CENTRAL_GAME_COVER_PATH } from "../lib/centralGameDefaults";
import { fetchPublicCentralGameMeta, fetchPublicGameList } from "../lib/publicGameMeta";

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
    
  ];
}

export default async function HomePage() {
  const centralMeta = await fetchPublicCentralGameMeta();
  const publicGames = await fetchPublicGameList();
  const featuredGames = publicGames.slice(0, 6);
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

        <section className="mt-14 md:mt-16" aria-labelledby="game-published-heading">
          <div className="rounded-3xl border border-white/80 bg-white/95 p-5 shadow-soft sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id="game-published-heading" className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                  โซนเกม
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  เกมที่เผยแพร่แล้วในระบบ — แตะการ์ดเพื่อเข้าเล่นได้ทันที
                </p>
              </div>
              <Link href="/game" className={btnSecondary}>
                ดูเกมทั้งหมด
              </Link>
            </div>

            {centralMeta ? (
              <div className="mt-5 rounded-2xl border border-brand-200/80 bg-brand-50/60 p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-brand-200/80 bg-white shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={centralMeta.coverImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{centralMeta.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <Link href="/game" className={btnPrimary}>
                        เข้าเล่น「{centralMeta.title}」
                      </Link>
                      <span className="inline-flex items-center rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-brand-900">
                        {centralMeta.cardCount} ป้าย
                      </span>
                    </div>
                  </div>
                </div>
                {centralMeta.description ? (
                  <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                    {centralMeta.description}
                  </p>
                ) : null}
              </div>
            ) : null}

            {featuredGames.length > 0 ? (
              <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featuredGames.map((g) => {
                  const cover = String(g.gameCoverUrl || "").trim() || DEFAULT_CENTRAL_GAME_COVER_PATH;
                  return (
                    <li key={g.id}>
                      <Link
                        href={`/game/${encodeURIComponent(g.id)}`}
                        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-200 hover:shadow-md"
                      >
                        <div className="flex gap-3 p-4">
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={cover} alt="" className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
                              {g.title || "เกม"}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              ผู้สร้าง:{" "}
                              <span className="font-medium text-slate-700">
                                {g.creatorUsername ? `@${g.creatorUsername}` : "แอดมิน"}
                              </span>
                            </p>
                          </div>
                        </div>
                        <p className="line-clamp-3 border-t border-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-600">
                          {String(g.description || "").trim() || "ไม่มีคำอธิบายสั้น"}
                        </p>
                        <span className="mt-auto border-t border-slate-100 bg-brand-50/60 px-4 py-2.5 text-center text-xs font-semibold text-brand-900">
                          เข้าเล่นเกมนี้
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                ยังไม่มีเกมที่เปิดแสดง
              </p>
            )}
          </div>
        </section>

        <section className="mt-14 md:mt-16" aria-labelledby="shortcuts-heading">
          <h2 id="shortcuts-heading" className="sr-only">
            ทางลัด
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      </main>
      <SiteFooter />
    </>
  );
}
