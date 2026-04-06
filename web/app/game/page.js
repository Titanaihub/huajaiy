import Link from "next/link";
import GameLandingFigmaShell from "../../components/GameLandingFigmaShell";
import GameShowcaseCatalog from "../../components/GameShowcaseCatalog";
import { PUBLIC_SHOP_PATH } from "../../lib/publicNavPaths";
import { fetchPublicGameList } from "../../lib/publicGameMeta";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ searchParams }) {
  const raw =
    typeof searchParams?.creator === "string"
      ? searchParams.creator.trim().toLowerCase()
      : "";
  if (raw) {
    return {
      title: `เกมของ @${raw} | HUAJAIY`,
      description: `รายการเกมที่เผยแพร่โดย @${raw} — HUAJAIY`
    };
  }
  return {
    title: "เกมทั้งหมด | HUAJAIY",
    description: "เลือกเกมที่คุณชอบและเริ่มเล่น — HUAJAIY"
  };
}

export default async function GamePage({ searchParams }) {
  const creatorFilter =
    typeof searchParams?.creator === "string"
      ? searchParams.creator.trim().toLowerCase()
      : "";

  const allGames = await fetchPublicGameList();

  const games = creatorFilter
    ? allGames.filter(
        (g) =>
          String(g.creatorUsername || "").trim().toLowerCase() === creatorFilter
      )
    : allGames;

  return (
    <GameLandingFigmaShell>
      <div className="bg-[#FFF0F5]">
        <div className="mx-auto max-w-[1200px] px-3 py-8 sm:px-5 sm:py-10">
          <GameShowcaseCatalog games={games} creatorFilter={creatorFilter} />
        </div>
      </div>

      <nav
        className="border-t border-pink-100 bg-white"
        aria-label="ทางลัดจากหน้าเกม"
      >
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-1 gap-y-2 px-3 py-5 sm:px-5">
          <Link
            href="/"
            className="shrink-0 whitespace-nowrap rounded-lg px-2 py-1 text-sm font-medium text-neutral-600 transition hover:bg-pink-50 hover:text-[#FF2E8C]"
          >
            ← หน้าแรก
          </Link>
          <Link
            href={PUBLIC_SHOP_PATH}
            className="shrink-0 whitespace-nowrap rounded-lg px-2 py-1 text-sm font-medium text-neutral-600 transition hover:bg-pink-50 hover:text-[#FF2E8C]"
          >
            ร้านค้า
          </Link>
          <Link
            href="/page"
            className="shrink-0 whitespace-nowrap rounded-lg px-2 py-1 text-sm font-medium text-neutral-600 transition hover:bg-pink-50 hover:text-[#FF2E8C]"
          >
            เพจชุมชน
          </Link>
          <Link
            href="/cart"
            className="shrink-0 whitespace-nowrap rounded-lg px-2 py-1 text-sm font-medium text-neutral-600 transition hover:bg-pink-50 hover:text-[#FF2E8C]"
          >
            ตะกร้า
          </Link>
        </div>
        <div className="border-t border-pink-50 bg-pink-50/30">
          <div className="mx-auto flex max-w-[1200px] flex-wrap justify-center gap-x-4 gap-y-2 px-3 py-3 text-xs text-neutral-500 sm:px-5">
            <Link href="/privacy" className="hover:text-[#FF2E8C] hover:underline">
              นโยบายความเป็นส่วนตัว
            </Link>
            <span aria-hidden>·</span>
            <Link href="/terms" className="hover:text-[#FF2E8C] hover:underline">
              ข้อกำหนดการให้บริการ
            </Link>
            <span aria-hidden>·</span>
            <Link href="/data-deletion" className="hover:text-[#FF2E8C] hover:underline">
              การลบข้อมูล
            </Link>
          </div>
        </div>
      </nav>
    </GameLandingFigmaShell>
  );
}
