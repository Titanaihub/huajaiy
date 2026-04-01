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
          <h1 className="hui-h2">เกม</h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-hui-body">
            เลือกเกมจากรายการด้านล่าง แต่ละการ์ดแสดงชื่อเกม ผู้สร้าง และคำอธิบายย่อ · คลิกเพื่อเข้าเล่นเกมนั้น
          </p>
        </div>

        <GameLobby initialGames={games} onBrand />

        <div className="mt-10 flex flex-wrap gap-4 border-t border-hui-border pt-8 text-sm">
          <Link
            href="/"
            className="font-medium text-hui-section underline decoration-hui-border underline-offset-2 hover:text-hui-cta"
          >
            ← หน้าแรก
          </Link>
          <Link
            href="/shop"
            className="font-medium text-hui-section underline decoration-hui-border underline-offset-2 hover:text-hui-cta"
          >
            ร้านค้า
          </Link>
          <Link
            href="/cart"
            className="font-medium text-hui-section underline decoration-hui-border underline-offset-2 hover:text-hui-cta"
          >
            ตะกร้า
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
