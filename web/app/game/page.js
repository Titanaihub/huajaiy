import Link from "next/link";
import GameLobby from "../../components/GameLobby";
import PublicOrganicShell from "../../components/PublicOrganicShell";
import { fetchPublicGameList, fetchPublicGameLobbyTheme } from "../../lib/publicGameMeta";
import { buildSiteRootBackgroundStyle } from "../../lib/siteThemeStyle";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
  return {
    title: "เกมและรางวัล | HUAJAIY",
    description: "รายการเกมเผยแพร่ — ค้นหาและเข้าเล่นได้จากการ์ด"
  };
}

export default async function GamePage() {
  const [games, gameLobbyTheme] = await Promise.all([
    fetchPublicGameList(),
    fetchPublicGameLobbyTheme()
  ]);

  const mainBgStyle = buildSiteRootBackgroundStyle({
    backgroundImageUrl: gameLobbyTheme.backgroundImageUrl,
    bgGradientTop: gameLobbyTheme.bgGradientTop,
    bgGradientMid: gameLobbyTheme.bgGradientMid,
    bgGradientBottom: gameLobbyTheme.bgGradientBottom,
    imageOverlayPercent: gameLobbyTheme.imageOverlayPercent
  });

  return (
    <PublicOrganicShell gameLobbyTheme={gameLobbyTheme} gameLobbyMainStyle={mainBgStyle}>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--gl-page-heading)]">
            เกมและรางวัล
          </h1>
        </div>

        <GameLobby initialGames={games} gameLobbyThemed />

        <nav
          className="mt-10 flex flex-wrap items-center gap-x-1 gap-y-2 border-t border-[color:var(--gl-card-border)] pt-8"
          aria-label="ทางลัดจากหน้าเกม"
        >
          <Link
            href="/"
            className="shrink-0 whitespace-nowrap rounded-lg px-2 py-1 text-sm font-medium text-[var(--gl-footer-nav)] transition hover:bg-black/[0.04] hover:text-[var(--gl-footer-nav-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 focus-visible:ring-offset-2"
          >
            ← หน้าแรก
          </Link>
          <Link
            href="/shop"
            className="shrink-0 whitespace-nowrap rounded-lg px-2 py-1 text-sm font-medium text-[var(--gl-footer-nav)] transition hover:bg-black/[0.04] hover:text-[var(--gl-footer-nav-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 focus-visible:ring-offset-2"
          >
            ร้านค้า
          </Link>
          <Link
            href="/cart"
            className="shrink-0 whitespace-nowrap rounded-lg px-2 py-1 text-sm font-medium text-[var(--gl-footer-nav)] transition hover:bg-black/[0.04] hover:text-[var(--gl-footer-nav-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 focus-visible:ring-offset-2"
          >
            ตะกร้า
          </Link>
        </nav>
      </main>
    </PublicOrganicShell>
  );
}
