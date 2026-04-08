import GameShowcaseCatalog from "../../components/GameShowcaseCatalog";
import PublicGamePageShell from "../../components/PublicGamePageShell";
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
    <PublicGamePageShell>
      <div className="bg-[#FFF0F5]">
        <div className="mx-auto max-w-[1200px] px-3 py-8 sm:px-5 sm:py-10">
          <GameShowcaseCatalog games={games} creatorFilter={creatorFilter} />
        </div>
      </div>
    </PublicGamePageShell>
  );
}
