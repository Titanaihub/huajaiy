import Link from "next/link";
import { notFound } from "next/navigation";
import FlipGameDemo from "../../../components/FlipGameDemo";
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

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50 shadow-sm ring-1 ring-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={centralMeta.coverImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">{centralMeta.title}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
              {centralMeta.creatorUsername ? (
                <Link
                  href={`/u/${centralMeta.creatorUsername}`}
                  className="font-medium text-brand-800 underline decoration-brand-300 underline-offset-2 hover:text-brand-950"
                >
                  @{centralMeta.creatorUsername}
                </Link>
              ) : null}
              {centralMeta.creatorUsername ? (
                <span className="text-slate-300" aria-hidden>
                  ·
                </span>
              ) : null}
              <Link
                href="/game"
                className="font-medium text-brand-800 underline decoration-brand-300 underline-offset-2 hover:text-brand-950"
              >
                ← รายการเกม
              </Link>
            </p>
          </div>
        </div>
        {centralMeta.description ? (
          <p className="mt-4 max-w-prose text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
            {centralMeta.description}
          </p>
        ) : null}
        <FlipGameDemo serverCentralPublished centralGameId={gameId} />
        <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200/80 pt-6 text-sm">
          <Link
            href="/game"
            className="font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-brand-800"
          >
            ← รายการเกม
          </Link>
          <Link
            href="/"
            className="font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-brand-800"
          >
            หน้าแรก
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
