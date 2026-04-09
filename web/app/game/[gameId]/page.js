import Link from "next/link";
import { notFound } from "next/navigation";
import CentralGamePlayRedeemRow from "../../../components/CentralGamePlayRedeemRow";
import FlipGameDemo from "../../../components/FlipGameDemo";
import InlineHeart from "../../../components/InlineHeart";
import PublicOrganicShell from "../../../components/PublicOrganicShell";
import { SOCIAL_BRAND_ICON_IMG_CLASS } from "../../../components/MemberSocialBrandMarks";
import { publicMemberPath } from "../../../lib/memberPublicUrls";
import { fetchPublicCentralGameMetaById } from "../../../lib/publicGameMeta";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** รหัสเกมสั้น (game_code) — ตัวเลข 10–32 หลัก */
const GAME_CODE_RE = /^[0-9]{10,32}$/;

function isValidGameRouteSegment(raw) {
  const s = String(raw || "").trim();
  if (!s) return false;
  return UUID_RE.test(s) || GAME_CODE_RE.test(s);
}

/** ธีมพิเศษ — รหัสเกมสั้น (สงกรานต์ / พื้นหลัง TP1) */
const TP1_PLAY_GAME_CODE = "2026040901";

/** ลิงก์บนพื้นไล่สีครีม–ชมพูอ่อน (การ์ดหัวข้อ) */
const navLinkCream =
  "shrink-0 whitespace-nowrap rounded-lg px-2 py-1 text-sm font-semibold text-[#3d3030] transition hover:bg-rose-100/60 hover:text-[#1f1a1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF9F2]";
/** ลิงก์บนพื้นไล่สีม่วง (ท้ายหน้า) */
const navLinkVioletBg =
  "shrink-0 whitespace-nowrap rounded-lg px-2 py-1 text-sm font-medium text-amber-100/90 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";
/** ลิงก์ท้ายหน้าเมื่อใช้พื้นหลังภาพ (อ่านชัดบนโฟโต้) */
const navLinkPhotoFooter =
  "shrink-0 whitespace-nowrap rounded-lg border border-white/40 bg-black/35 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm backdrop-blur-md transition hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

export async function generateMetadata({ params }) {
  const raw = params?.gameId;
  const gameRef = typeof raw === "string" ? raw.trim() : "";
  const pagePath = gameRef ? `/game/${encodeURIComponent(gameRef)}` : "/game";
  if (!isValidGameRouteSegment(gameRef)) {
    return {
      title: "เกม | HUAJAIY",
      alternates: { canonical: "/game" }
    };
  }
  const m = await fetchPublicCentralGameMetaById(gameRef);
  if (m) {
    const title = `${m.title} | HUAJAIY`;
    const description = m.description?.trim() || `เล่น ${m.title} — เกมเปิดป้ายบนเว็บ`;
    const imageUrl = String(m.coverImageUrl || "").trim();
    return {
      title,
      description,
      alternates: { canonical: pagePath },
      openGraph: {
        title,
        description,
        type: "website",
        url: pagePath,
        ...(imageUrl ? { images: [{ url: imageUrl, alt: m.title }] } : {})
      },
      twitter: {
        card: imageUrl ? "summary_large_image" : "summary",
        title,
        description,
        ...(imageUrl ? { images: [imageUrl] } : {})
      }
    };
  }
  return {
    title: "เกม | HUAJAIY",
    alternates: { canonical: pagePath }
  };
}

export default async function GamePlayPage({ params }) {
  const raw = params?.gameId;
  const gameRef = typeof raw === "string" ? raw.trim() : "";
  if (!isValidGameRouteSegment(gameRef)) {
    notFound();
  }
  const centralMeta = await fetchPublicCentralGameMetaById(gameRef);
  if (!centralMeta) {
    notFound();
  }

  const showHeartCosts =
    centralMeta.pinkHeartCost > 0 || centralMeta.redHeartCost > 0;

  const isTp1PlayPage = gameRef === TP1_PLAY_GAME_CODE;

  const gameLobbyMainStyle = isTp1PlayPage
    ? {
        backgroundColor: "#e0f2fe",
        backgroundImage:
          "linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(224,242,254,0.2) 42%, rgba(255,255,255,0.35) 100%), url(/game-bg/tp1.png)",
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "scroll",
        minHeight: "100%"
      }
    : {
        background: "linear-gradient(165deg, #1e0b2e 0%, #3d1450 38%, #6b2d5c 72%, #8a3d6b 100%)",
        backgroundAttachment: "fixed",
        minHeight: "100%"
      };

  return (
    <PublicOrganicShell gameLobbyMainStyle={gameLobbyMainStyle}>
      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
        <div className="space-y-5">
          <div
            className={
              isTp1PlayPage
                ? "rounded-2xl border border-white/50 bg-white/93 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] ring-1 ring-white/40 backdrop-blur-md sm:p-6"
                : "rounded-2xl border border-rose-200/80 bg-gradient-to-b from-[#FFF9F2] to-[#F7D7D7] p-5 shadow-[0_12px_36px_rgba(90,40,60,0.12)] ring-1 ring-rose-200/50 sm:p-6"
            }
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="mx-auto h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-rose-200/90 bg-white shadow-md ring-1 ring-white/80 sm:mx-0 sm:h-28 sm:w-28">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={centralMeta.coverImageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p
                  className={
                    isTp1PlayPage
                      ? "text-[10px] font-bold uppercase tracking-[0.35em] text-sky-900/85 sm:text-xs"
                      : "text-[10px] font-bold uppercase tracking-[0.35em] text-[#6b5348] sm:text-xs"
                  }
                >
                  เกมส่วนกลาง
                </p>
                <h1
                  className={
                    isTp1PlayPage
                      ? "mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
                      : "mt-1 text-2xl font-bold tracking-tight text-[#2a2228] sm:text-3xl"
                  }
                >
                  {centralMeta.title}
                </h1>
                {showHeartCosts ? (
                  <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
                    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-sm sm:justify-start">
                      <span className="font-semibold text-[#4a3d40]">หักต่อรอบ</span>
                      {centralMeta.pinkHeartCost > 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-pink-300/80 bg-white/90 px-2.5 py-1 text-pink-950 shadow-sm ring-1 ring-pink-200/60">
                          <InlineHeart size="md" className="text-pink-600" />
                          <span className="text-base font-bold tabular-nums">{centralMeta.pinkHeartCost}</span>
                          <span className="text-xs font-semibold text-pink-900">หัวใจชมพู</span>
                        </span>
                      ) : null}
                      {centralMeta.pinkHeartCost > 0 && centralMeta.redHeartCost > 0 ? (
                        <span className="text-[#7a6a6e]" aria-hidden>
                          ·
                        </span>
                      ) : null}
                      {centralMeta.redHeartCost > 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-300/80 bg-white/90 px-2.5 py-1 text-red-950 shadow-sm ring-1 ring-red-200/60">
                          <InlineHeart size="md" className="text-red-600" />
                          <span className="text-base font-bold tabular-nums">{centralMeta.redHeartCost}</span>
                          <span className="text-xs font-semibold text-red-900">หัวใจแดงเล่นเกม</span>
                        </span>
                      ) : null}
                    </div>
                    <CentralGamePlayRedeemRow
                      pinkHeartCost={centralMeta.pinkHeartCost}
                      redHeartCost={centralMeta.redHeartCost}
                      heartCurrencyMode={centralMeta.heartCurrencyMode}
                      acceptsPinkHearts={centralMeta.acceptsPinkHearts}
                      className="w-full shrink-0 text-center sm:text-left lg:max-w-[min(100%,22rem)]"
                    />
                  </div>
                ) : null}
                <p
                  className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm sm:justify-start ${
                    isTp1PlayPage ? "text-slate-700" : "text-[#4a3d40]"
                  } ${showHeartCosts ? "mt-3" : "mt-2"}`}
                >
                  {centralMeta.creatorUsername ? (
                    <Link
                      href={publicMemberPath(centralMeta.creatorUsername)}
                      className="font-semibold text-rose-800 underline decoration-rose-500/70 underline-offset-2 hover:text-rose-950"
                    >
                      @{centralMeta.creatorUsername}
                    </Link>
                  ) : null}
                  {centralMeta.creatorUsername ? (
                    <span className="text-zinc-400" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  <Link href="/game" className={navLinkCream}>
                    ← รายการเกม
                  </Link>
                  {centralMeta.creatorSocialLineUrl ? (
                    <>
                      <span className="text-zinc-400" aria-hidden>
                        ·
                      </span>
                      <a
                        href={centralMeta.creatorSocialLineUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-semibold text-rose-700 underline decoration-rose-400/70 underline-offset-2 transition hover:text-rose-900"
                        title="เปิด LINE เพื่อติดต่อเจ้าของเกม"
                      >
                        ติดต่อเจ้าของเกม
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/social/line.png"
                          alt=""
                          width={36}
                          height={36}
                          className={`${SOCIAL_BRAND_ICON_IMG_CLASS} shrink-0`}
                        />
                      </a>
                    </>
                  ) : null}
                </p>
              </div>
            </div>

            {centralMeta.description ? (
              <div
                className={
                  isTp1PlayPage
                    ? "mt-5 border-t border-sky-200/70 pt-5"
                    : "mt-5 border-t border-rose-300/55 pt-5"
                }
              >
                <p
                  className={
                    isTp1PlayPage
                      ? "text-[10px] font-bold uppercase tracking-[0.28em] text-sky-900/80 sm:text-xs"
                      : "text-[10px] font-bold uppercase tracking-[0.28em] text-[#6b5348] sm:text-xs"
                  }
                >
                  คำอธิบายเกม
                </p>
                <p
                  className={
                    isTp1PlayPage
                      ? "mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800 sm:text-base"
                      : "mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#2a2228] sm:text-base"
                  }
                >
                  {centralMeta.description}
                </p>
              </div>
            ) : null}
          </div>

          <FlipGameDemo
            serverCentralPublished
            centralGameId={centralMeta.gameId}
            playSurfaceTheme={isTp1PlayPage ? "tp1" : null}
          />

          <nav
            className={
              isTp1PlayPage
                ? "flex flex-wrap items-center gap-x-1 gap-y-2 border-t border-white/25 pt-6"
                : "flex flex-wrap items-center gap-x-1 gap-y-2 border-t border-amber-400/25 pt-6"
            }
            aria-label="ทางลัดหลังเล่นเกม"
          >
            <Link href="/game" className={isTp1PlayPage ? navLinkPhotoFooter : navLinkVioletBg}>
              ← รายการเกม
            </Link>
            <Link href="/" className={isTp1PlayPage ? navLinkPhotoFooter : navLinkVioletBg}>
              หน้าแรก
            </Link>
          </nav>
        </div>
      </main>
    </PublicOrganicShell>
  );
}
