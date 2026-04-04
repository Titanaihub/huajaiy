import Link from "next/link";
import GameLobby from "../../components/GameLobby";
import PublicOrganicShell from "../../components/PublicOrganicShell";
import { fetchPublicGameList } from "../../lib/publicGameMeta";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const navLink =
  "shrink-0 whitespace-nowrap rounded-lg px-2 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-200/80 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 focus-visible:ring-offset-2";

export async function generateMetadata() {
  return {
    title: "เกมและรางวัล | HUAJAIY",
    description:
      "รายการเกมเผยแพร่ทั้งหมด — ค้นหาชื่อเกมหรือผู้สร้าง แตะการ์ดเพื่อเข้าเล่นและลุ้นรางวัล"
  };
}

export default async function GamePage() {
  const games = await fetchPublicGameList();

  return (
    <PublicOrganicShell>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            เกมและรางวัล
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600">
            เกมเผยแพร่ทั้งหมดในระบบ — แต่ละการ์ดมีปกเกม ชื่อ ผู้สร้าง ค่าหัวใจ และคำอธิบาย ·
            คลิกการ์ดเพื่อเข้าเล่นและลุ้นรางวัล
          </p>
        </div>

        <GameLobby initialGames={games} onBrand />

        <nav
          className="mt-10 flex flex-wrap items-center gap-x-1 gap-y-2 border-t border-slate-200 pt-8"
          aria-label="ทางลัดจากหน้าเกม"
        >
          <Link href="/" className={navLink}>
            ← หน้าแรก
          </Link>
          <Link href="/shop" className={navLink}>
            ร้านค้า
          </Link>
          <Link href="/cart" className={navLink}>
            ตะกร้า
          </Link>
        </nav>
      </main>
    </PublicOrganicShell>
  );
}
