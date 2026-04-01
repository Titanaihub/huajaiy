import Link from "next/link";
import { notFound } from "next/navigation";
import FlipGameDemo from "../../../components/FlipGameDemo";
import InlineHeart from "../../../components/InlineHeart";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
import { fetchPublicCentralGameMetaById } from "../../../lib/publicGameMeta";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }) {
  const raw = params?.gameId;
  const gameId = typeof raw === "string" ? raw.trim() : "";
  if (!UUID_RE.test(gameId)) {
    return { title: "เกม | HUAJAIY" };
  }
  const m = await fetchPublicCentralGameMetaById(gameId);
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
  const gameId = typeof raw === "string" ? raw.trim() : "";
  if (!UUID_RE.test(gameId)) {
    notFound();
  }
  const centralMeta = await fetchPublicCentralGameMetaById(gameId);
  if (!centralMeta) {
    notFound();
  }

  const showHeartCosts =
    centralMeta.pinkHeartCost > 0 || centralMeta.redHeartCost > 0;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
        <div className="rounded-3xl border border-hui-border/80 bg-hui-surface/95 p-4 shadow-soft sm:p-6">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-hui-border bg-hui-pageTop shadow-sm ring-1 ring-hui-border/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={centralMeta.coverImageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="hui-h2 tracking-tight">{centralMeta.title}</h1>
              {showHeartCosts ? (
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
                  <span className="font-medium text-hui-muted">หักต่อรอบ</span>
                  {centralMeta.pinkHeartCost > 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-pink-50 px-2 py-1 text-pink-900 ring-1 ring-pink-200/90">
                      <InlineHeart size="md" className="text-pink-500" />
                      <span className="text-sm font-bold tabular-nums">{centralMeta.pinkHeartCost}</span>
                      <span className="text-[11px] font-semibold text-pink-800">หัวใจชมพู</span>
                    </span>
                  ) : null}
                  {centralMeta.pinkHeartCost > 0 && centralMeta.redHeartCost > 0 ? (
                    <span className="text-hui-border" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  {centralMeta.redHeartCost > 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2 py-1 text-red-900 ring-1 ring-red-200/80">
                      <InlineHeart size="md" className="text-red-600" />
                      <span className="text-sm font-bold tabular-nums">{centralMeta.redHeartCost}</span>
                      <span className="text-[11px] font-semibold text-red-800">หัวใจแดง</span>
                    </span>
                  ) : null}
                </div>
              ) : null}
              <p
                className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-hui-muted ${
                  showHeartCosts ? "mt-2" : "mt-1"
                }`}
              >
                {centralMeta.creatorUsername ? (
                  <Link
                    href={`/u/${centralMeta.creatorUsername}`}
                    className="font-medium text-hui-cta underline decoration-hui-cta/40 underline-offset-2 hover:brightness-95"
                  >
                    @{centralMeta.creatorUsername}
                  </Link>
                ) : null}
                {centralMeta.creatorUsername ? (
                  <span className="text-hui-border" aria-hidden>
                    ·
                  </span>
                ) : null}
                <Link
                  href="/game"
                  className="font-medium text-hui-cta underline decoration-hui-cta/40 underline-offset-2 hover:brightness-95"
                >
                  ← รายการเกม
                </Link>
              </p>
            </div>
          </div>
          {centralMeta.description ? (
            <p className="mt-4 max-w-prose whitespace-pre-wrap text-base leading-relaxed text-hui-body">
              {centralMeta.description}
            </p>
          ) : null}
          <FlipGameDemo serverCentralPublished centralGameId={gameId} />
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-hui-border/80 pt-6 text-sm">
            <Link
              href="/game"
              className="font-medium text-hui-cta underline decoration-hui-cta/40 underline-offset-2"
            >
              ← รายการเกม
            </Link>
            <Link href="/" className="font-medium text-hui-cta underline decoration-hui-cta/40 underline-offset-2">
              หน้าแรก
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
