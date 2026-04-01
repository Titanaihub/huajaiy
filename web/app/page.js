import Link from "next/link";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { DEFAULT_CENTRAL_GAME_COVER_PATH } from "../lib/centralGameDefaults";
import { fetchPublicCentralGameMeta, fetchPublicGameList } from "../lib/publicGameMeta";

function buildActions(centralMeta) {
  return [
    {
      href: "/shop",
      title: "ร้านค้า",
      desc: "ดูสินค้าตัวอย่างและแต้มหัวใจ",
      accent: "border-hui-border/90 bg-gradient-to-br from-hui-pageTop/90 to-white"
    },
    {
      href: "/cart",
      title: "ตะกร้า",
      desc: "จัดการรายการและยืนยันออเดอร์สาธิต",
      accent: "border-hui-border/90 bg-white"
    },
    {
      href: "/game",
      title: centralMeta ? centralMeta.title : "เกมเปิดป้าย",
      desc: centralMeta
        ? `เผยแพร่แล้ว · ${centralMeta.cardCount} ป้าย — แตะเพื่อเล่นเกมส่วนกลาง`
        : "ทดสอบกติกาสะสมครบก่อนชนะ",
      accent: centralMeta
        ? "border-hui-cta/25 bg-gradient-to-br from-hui-pageTop to-white ring-1 ring-hui-border/80"
        : "border-hui-border/90 bg-white",
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
        <section className="relative overflow-hidden rounded-3xl border border-hui-border bg-hui-surface/95 p-8 shadow-soft md:p-10 lg:p-12">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-hui-border/50 via-hui-pageTop/60 to-transparent blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-hui-pageMid/90 blur-2xl"
            aria-hidden
          />
          <div className="relative max-w-4xl space-y-4">
            <h1 className="hui-h1">ยินดีต้อนรับ สู่แพลตฟอร์มหัวใจ</h1>
            <p className="text-base leading-relaxed text-hui-body md:text-lg">
              แพลตฟอร์มหัวใจ ช่วยยกระดับกิจกรรมและการโปรโมทให้โดดเด่นยิ่งขึ้น ด้วยเกมเปิดป้ายแจกรางวัลที่คุณออกแบบได้ตามต้องการ เพื่อสร้างความสนุก กระตุ้นการมีส่วนร่วม เพิ่มโอกาสในการขาย และขยายฐานผู้ติดตาม
            </p>
          </div>
        </section>

        <section className="mt-14 md:mt-16" aria-labelledby="game-published-heading">
          <h2 id="game-published-heading" className="sr-only">
            เกม
          </h2>

          {featuredGames.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredGames.map((g) => {
                const cover = String(g.gameCoverUrl || "").trim() || DEFAULT_CENTRAL_GAME_COVER_PATH;
                return (
                  <li key={g.id}>
                    <Link
                      href={`/game/${encodeURIComponent(g.id)}`}
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-hui-border bg-white shadow-sm transition hover:border-hui-cta/30 hover:shadow-md"
                    >
                      <div className="flex gap-3 p-4 sm:p-5">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-hui-border/70 bg-hui-pageTop sm:h-[4.5rem] sm:w-[4.5rem]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={cover} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-base font-semibold leading-snug text-hui-section sm:text-[1.0625rem]">
                            {g.title || "เกม"}
                          </p>
                          <p className="mt-1.5 text-sm text-hui-muted">
                            ผู้สร้าง:{" "}
                            <span className="font-medium text-hui-body">
                              {g.creatorUsername ? `@${g.creatorUsername}` : "แอดมิน"}
                            </span>
                          </p>
                        </div>
                      </div>
                      <p className="line-clamp-3 border-t border-hui-border/70 px-4 py-3 text-sm leading-relaxed text-hui-body sm:px-5 sm:py-3.5">
                        {String(g.description || "").trim() || "ไม่มีคำอธิบายสั้น"}
                      </p>
                      <span className="mt-auto border-t border-hui-border/70 bg-hui-pageTop/80 px-4 py-3 text-center text-sm font-semibold text-hui-section sm:px-5">
                        เข้าเล่นเกมนี้
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-xl border border-hui-border bg-white px-4 py-3 text-sm text-hui-muted">
              ยังไม่มีเกมที่เปิดแสดง
            </p>
          )}
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
                  className={`group flex h-full min-h-[9.5rem] flex-col rounded-2xl border p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-hui-cta/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hui-cta/35 focus-visible:ring-offset-2 sm:min-h-[10rem] sm:p-6 ${a.accent}`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-base font-semibold text-hui-section group-hover:text-hui-burgundy sm:text-[1.0625rem]">
                      {a.title}
                    </span>
                    {a.badge ? (
                      <span className="shrink-0 rounded-full bg-hui-cta px-2.5 py-0.5 text-sm font-bold uppercase tracking-wide text-white">
                        {a.badge}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-3 flex-1 text-base leading-relaxed text-hui-body">
                    {a.desc}
                  </span>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-hui-cta">
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
