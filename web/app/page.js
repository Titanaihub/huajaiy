import HomeOrganicChrome from "../components/HomeOrganicChrome";
import { buildCommunityLobbyPosts } from "../lib/communityLobbyPosts";
import { fetchOrganicHomePublic } from "../lib/fetchOrganicHomePublic";
import { fetchPublicMarketplaceProducts } from "../lib/fetchPublicMarketplaceProducts";
import { fetchPublicMemberPages } from "../lib/fetchPublicMemberPages";
import { mergeOrganicHomeFromApi } from "../lib/organicHomeFormDefaults";
import { fetchPublicGameList, fetchPublicGameLobbyTheme } from "../lib/publicGameMeta";

export const metadata = {
  title: "หน้าแรก | HUAJAIY",
  description: "HUAJAIY — แพลตฟอร์มหัวใจ เกม และร้านค้า"
};

export default async function HomePage() {
  let recommendedGames = [];
  try {
    recommendedGames = await fetchPublicGameList();
  } catch {
    recommendedGames = [];
  }

  const [rawOrganic, memberPages, featuredProducts, gameLobbyTheme] = await Promise.all([
    fetchOrganicHomePublic(),
    fetchPublicMemberPages(24).catch(() => []),
    fetchPublicMarketplaceProducts(8).catch(() => []),
    fetchPublicGameLobbyTheme().catch(() => null)
  ]);

  const oh = mergeOrganicHomeFromApi(rawOrganic || {});
  const { lobbyPosts } = buildCommunityLobbyPosts({
    blogBlock: oh.sectionHeadings?.blog,
    communityPage: oh.communityPage,
    memberPages
  });
  const communityPosts = lobbyPosts.slice(0, 6);

  return (
    <HomeOrganicChrome
      recommendedGames={recommendedGames}
      communityPosts={communityPosts}
      featuredProducts={featuredProducts}
      featuredHeading={oh.sectionHeadings?.featured}
      gameLobbyTheme={gameLobbyTheme}
    />
  );
}
