import CommunityPageView from "../../components/CommunityPageView";
import PublicOrganicShell from "../../components/PublicOrganicShell";
import { fetchOrganicHomePublic } from "../../lib/fetchOrganicHomePublic";
import { fetchPublicMemberPages } from "../../lib/fetchPublicMemberPages";
import { mergeOrganicHomeFromApi } from "../../lib/organicHomeFormDefaults";
import { fetchPublicGameLobbyTheme } from "../../lib/publicGameMeta";
import { buildSiteRootBackgroundStyle } from "../../lib/siteThemeStyle";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function metaBlogTitle(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return "เพจชุมชน";
  const l = t.toLowerCase();
  if (l === "our recent blog" || l === "our blog" || l === "recent blog") {
    return "เพจชุมชน";
  }
  return t;
}

export async function generateMetadata() {
  const raw = await fetchOrganicHomePublic();
  const oh = mergeOrganicHomeFromApi(raw || {});
  const title = metaBlogTitle(oh.sectionHeadings?.blog?.title);
  let desc = oh.sectionHeadings?.blog?.subtitle?.trim() || "";
  if (!desc || desc.toLowerCase().includes("lorem ipsum")) {
    desc = "เพจชุมชน — ลิงก์และโพสต์จากผู้ดูแลเว็บ";
  }
  return {
    title: `${title} | HUAJAIY`,
    description: desc
  };
}

export default async function CommunityPageRoute() {
  const [raw, gameLobbyTheme, memberPages] = await Promise.all([
    fetchOrganicHomePublic(),
    fetchPublicGameLobbyTheme(),
    fetchPublicMemberPages(24)
  ]);
  const oh = mergeOrganicHomeFromApi(raw || {});

  const mainBgStyle = buildSiteRootBackgroundStyle({
    backgroundImageUrl: gameLobbyTheme.backgroundImageUrl,
    bgGradientTop: gameLobbyTheme.bgGradientTop,
    bgGradientMid: gameLobbyTheme.bgGradientMid,
    bgGradientBottom: gameLobbyTheme.bgGradientBottom,
    imageOverlayPercent: gameLobbyTheme.imageOverlayPercent
  });

  return (
    <PublicOrganicShell gameLobbyTheme={gameLobbyTheme} gameLobbyMainStyle={mainBgStyle}>
      <CommunityPageView
        blogBlock={oh.sectionHeadings?.blog}
        communityPage={oh.communityPage}
        memberPages={memberPages}
      />
    </PublicOrganicShell>
  );
}
