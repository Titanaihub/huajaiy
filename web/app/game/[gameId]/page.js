import Link from "next/link";
import { notFound } from "next/navigation";
import FlipGameDemo from "../../../components/FlipGameDemo";
import InlineHeart from "../../../components/InlineHeart";
import PublicOrganicShell from "../../../components/PublicOrganicShell";
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

const navLink =
  "shrink-0 whitespace-nowrap rounded-lg px-2 py-1 text-sm font-medium text-zinc-600 transition hover:bg-pink-100/90 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

export async function generateMetadata({ params }) {
  const raw = params?.gameId;
  const gameRef = typeof raw === "string" ? raw.trim() : "";
  if (!isValidGameRouteSegment(gameRef)) {
    return { title: "เกม | HUAJAIY" };
  }
  const m = await fetchPublicCentralGameMetaById(gameRef);
  if (m) {
    return {
      title: `${m.title} | HUAJAIY`,
      description: m.description?.trim() || `เล่น ${m.title} — เกมเปิดป้ายบนเว็บ`
    };
  }
  return { title: "เกม | HUAJAIY" };
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

  return (
    <PublicOrganicShell gameLobbyMainStyle={{ backgroundColor: "#ffffff" }}>
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
        <div className="space-y-5">
          <div className="rounded-2xl border border-pink-200/90 bg-pink-50 p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="mx-auto h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-pink-200 bg-white shadow-sm ring-1 ring-pink-100 sm:mx-0 sm:h-28 sm:w-28">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={centralMeta.coverImageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-pink-700/90 sm:text-xs">
                  เกมส่วนกลาง
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                  {centralMeta.title}
                </h1>
                {showHeartCosts ? (
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-sm sm:justify-start">
                    <span className="font-semibold text-zinc-600">หักต่อรอบ</span>
                    {centralMeta.pinkHeartCost > 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-pink-100 px-2.5 py-1 text-pink-900 ring-1 ring-pink-300/70">
                        <InlineHeart size="md" className="text-pink-600" />
                        <span className="text-base font-bold tabular-nums">{centralMeta.pinkHeartCost}</span>
                        <span className="text-xs font-semibold text-pink-800">หัวใจชมพู</span>
                      </span>
                    ) : null}
                    {centralMeta.pinkHeartCost > 0 && centralMeta.redHeartCost > 0 ? (
                      <span className="text-zinc-500" aria-hidden>
                        ·
                      </span>
                    ) : null}
                    {centralMeta.redHeartCost > 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-2.5 py-1 text-red-900 ring-1 ring-red-300/70">
                        <InlineHeart size="md" className="text-red-600" />
                        <span className="text-base font-bold tabular-nums">{centralMeta.redHeartCost}</span>
                        <span className="text-xs font-semibold text-red-900">หัวใจแดงห้องเกม</span>
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <p
                  className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-zinc-600 sm:justify-start ${
                    showHeartCosts ? "mt-3" : "mt-2"
                  }`}
                >
                  {centralMeta.creatorUsername ? (
                    <Link
                      href={publicMemberPath(centralMeta.creatorUsername)}
                      className="font-medium text-pink-800 underline decoration-pink-400/70 underline-offset-2 hover:text-pink-950"
                    >
                      @{centralMeta.creatorUsername}
                    </Link>
                  ) : null}
                  {centralMeta.creatorUsername ? (
                    <span className="text-zinc-400" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  <Link href="/game" className={navLink}>
                    ← รายการเกม
                  </Link>
                </p>
              </div>
            </div>

            {centralMeta.description ? (
              <div className="mt-5 border-t border-pink-200/90 pt-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-pink-700/90 sm:text-xs">
                  คำอธิบายเกม
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 sm:text-base">
                  {centralMeta.description}
                </p>
              </div>
            ) : null}
          </div>

          <FlipGameDemo serverCentralPublished centralGameId={centralMeta.gameId} />

          <nav
            className="flex flex-wrap items-center gap-x-1 gap-y-2 border-t border-zinc-200 pt-6"
            aria-label="ทางลัดหลังเล่นเกม"
          >
            <Link href="/game" className={navLink}>
              ← รายการเกม
            </Link>
            <Link href="/" className={navLink}>
              หน้าแรก
            </Link>
          </nav>
        </div>
      </main>
    </PublicOrganicShell>
  );
}
