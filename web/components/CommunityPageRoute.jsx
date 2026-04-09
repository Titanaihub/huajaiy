import CommunityPageView from "./CommunityPageView";
import PublicOrganicShell from "./PublicOrganicShell";
import ScrollToCommunitySection from "./ScrollToCommunitySection";
import { fetchOrganicHomePublic } from "../lib/fetchOrganicHomePublic";
import { fetchPublicMemberPages } from "../lib/fetchPublicMemberPages";
import { mergeOrganicHomeFromApi } from "../lib/organicHomeFormDefaults";
import { fetchPublicGameLobbyTheme } from "../lib/publicGameMeta";
import { buildSiteRootBackgroundStyle } from "../lib/siteThemeStyle";
import { mergeCommunityPinkLobbyTheme } from "../lib/communityPinkLobbyTheme";
import { fetchHomeLatestMemberPosts } from "../lib/publicMemberPosts";

function metaBlogTitle(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return "เพจชุมชน";
  const l = t.toLowerCase();
  if (l === "our recent blog" || l === "our blog" || l === "recent blog") {
    return "เพจชุมชน";
  }
  return t;
}

export async function getCommunityPageMetadata() {
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

/** metadata สำหรับ /posts — โพสต์สมาชิก ไม่ใช่รายการเพจ */
export async function getCommunityPostsPageMetadata() {
  return {
    title: "โพสต์ชุมชน | HUAJAIY",
    description: "โพสต์ล่าสุดจากสมาชิก — HUAJAIY"
  };
}

/**
 * @param {{ activeNavKey: 'posts' | 'page'; scrollToSection?: 'lobby' | 'title' | null; showShortcutNav?: boolean }} props
 */
export default async function CommunityPageRoute({
  activeNavKey,
  scrollToSection = null,
  showShortcutNav = true
}) {
  const [raw, gameLobbyTheme, memberPages, publicMemberFeedPosts] = await Promise.all([
    fetchOrganicHomePublic(),
    fetchPublicGameLobbyTheme(),
    fetchPublicMemberPages(24),
    activeNavKey === "posts" ? fetchHomeLatestMemberPosts(48) : Promise.resolve([])
  ]);
  const oh = mergeOrganicHomeFromApi(raw || {});
  const pinkTheme = mergeCommunityPinkLobbyTheme(gameLobbyTheme);
  const mainBgStyle = buildSiteRootBackgroundStyle({
    backgroundImageUrl: pinkTheme.backgroundImageUrl,
    bgGradientTop: pinkTheme.bgGradientTop,
    bgGradientMid: pinkTheme.bgGradientMid,
    bgGradientBottom: pinkTheme.bgGradientBottom,
    imageOverlayPercent: pinkTheme.imageOverlayPercent
  });
  const pinkBarTitle =
    activeNavKey === "posts"
      ? "โพสต์ชุมชน"
      : metaBlogTitle(oh.sectionHeadings?.blog?.title);

  return (
    <PublicOrganicShell
      gameLobbyTheme={pinkTheme}
      gameLobbyMainStyle={mainBgStyle}
      pinkBarMenuLabel={pinkBarTitle}
      activeNavKey={activeNavKey}
    >
      <ScrollToCommunitySection target={scrollToSection} />
      <CommunityPageView
        blogBlock={oh.sectionHeadings?.blog}
        communityPage={oh.communityPage}
        memberPages={memberPages}
        publicMemberFeedPosts={publicMemberFeedPosts}
        lobbyHeadingOverride={activeNavKey === "posts" ? "โพสต์ชุมชน" : null}
        contentMode={activeNavKey === "posts" ? "posts" : activeNavKey === "page" ? "pages" : "mixed"}
        showShortcutNav={showShortcutNav}
      />
    </PublicOrganicShell>
  );
}
