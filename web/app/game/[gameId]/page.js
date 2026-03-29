import Link from "next/link";
import { notFound } from "next/navigation";
import FlipGameDemo from "../../../components/FlipGameDemo";
import GameApiLiveStatus from "../../../components/GameApiLiveStatus";
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
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={centralMeta.coverImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-slate-900">{centralMeta.title}</h1>
            <p className="mt-2 text-sm text-slate-600">
              เกมส่วนกลาง — เปิดป้ายตามกติกา ·{" "}
              <Link href="/game" className="text-brand-800 underline hover:text-brand-950">
                กลับไปรายการเกมทั้งหมด
              </Link>
            </p>
          </div>
        </div>
        <GameApiLiveStatus gameId={gameId} />
        <FlipGameDemo serverCentralPublished centralGameId={gameId} />
        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          <Link href="/game" className="text-blue-600 underline hover:text-blue-800">
            ← รายการเกม
          </Link>
          <Link href="/" className="text-blue-600 underline hover:text-blue-800">
            หน้าแรก
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
