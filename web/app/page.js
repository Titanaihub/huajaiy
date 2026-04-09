import HomeOrganicChrome from "../components/HomeOrganicChrome";
import { fetchHomeLatestMemberPosts } from "../lib/publicMemberPosts";
import { fetchPublicGameList } from "../lib/publicGameMeta";
import { SITE_SHARE_DESCRIPTION } from "../lib/siteShareMetadata";

export const metadata = {
  title: "หน้าแรก | HUAJAIY",
  description: SITE_SHARE_DESCRIPTION,
  openGraph: {
    title: "HUAJAIY",
    description: SITE_SHARE_DESCRIPTION
  },
  twitter: {
    title: "HUAJAIY",
    description: SITE_SHARE_DESCRIPTION
  }
};

export default async function HomePage() {
  let recommendedGames = [];
  let latestMemberPosts = [];
  try {
    recommendedGames = await fetchPublicGameList();
  } catch {
    recommendedGames = [];
  }
  try {
    latestMemberPosts = await fetchHomeLatestMemberPosts(6);
  } catch {
    latestMemberPosts = [];
  }
  return <HomeOrganicChrome recommendedGames={recommendedGames} latestMemberPosts={latestMemberPosts} />;
}
