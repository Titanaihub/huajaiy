import HomeOrganicChrome from "../components/HomeOrganicChrome";
import { fetchPublicGameList } from "../lib/publicGameMeta";

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
  return <HomeOrganicChrome recommendedGames={recommendedGames} />;
}
