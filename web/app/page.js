import HomeOrganicChrome from "../components/HomeOrganicChrome";
import { fetchHomeLatestMemberPosts } from "../lib/publicMemberPosts";
import { fetchPublicGameList } from "../lib/publicGameMeta";

export const metadata = {
  title: "หน้าแรก | HUAJAIY",
  description: "HUAJAIY — แพลตฟอร์มหัวใจ เกม และร้านค้า"
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
