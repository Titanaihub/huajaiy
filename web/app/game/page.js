import Link from "next/link";
import GameLobby from "../../components/GameLobby";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { fetchPublicGameList } from "../../lib/publicGameMeta";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
  return {
    title: "เกม | HUAJAIY",
    description: "เลือกเกมจากรายการ — ค้นหาชื่อเกมหรือผู้สร้าง แล้วเข้าเล่นได้ทันที"
  };
}

export default async function GamePage() {
  const games = await fetchPublicGameList();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">เกม</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            เลือกเกมจากรายการด้านล่าง แต่ละการ์ดแสดงชื่อเกม ผู้สร้าง และคำอธิบายย่อ · คลิกเพื่อเข้าเล่นเกมนั้น
          </p>
        </div>

        <GameLobby initialGames={games} />

        <div className="mt-10 flex flex-wrap gap-4 border-t border-slate-200 pt-8 text-sm">
          <Link href="/" className="text-blue-600 underline hover:text-blue-800">
            ← หน้าแรก
          </Link>
          <Link href="/shop" className="text-blue-600 underline hover:text-blue-800">
            ร้านค้า
          </Link>
          <Link href="/cart" className="text-blue-600 underline hover:text-blue-800">
            ตะกร้า
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
