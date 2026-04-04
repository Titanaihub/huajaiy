import CommunityPageView from "../../components/CommunityPageView";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { fetchOrganicHomePublic } from "../../lib/fetchOrganicHomePublic";
import {
  mergeOrganicHomeFromApi
} from "../../lib/organicHomeFormDefaults";

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
  const raw = await fetchOrganicHomePublic();
  const oh = mergeOrganicHomeFromApi(raw || {});

  return (
    <>
      <SiteHeader />
      <CommunityPageView
        blogBlock={oh.sectionHeadings?.blog}
        communityPage={oh.communityPage}
      />
      <SiteFooter />
    </>
  );
}
