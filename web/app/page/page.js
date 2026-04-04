import CommunityPageView from "../../components/CommunityPageView";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { fetchOrganicHomePublic } from "../../lib/fetchOrganicHomePublic";
import {
  mergeOrganicHomeFromApi
} from "../../lib/organicHomeFormDefaults";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
  const raw = await fetchOrganicHomePublic();
  const oh = mergeOrganicHomeFromApi(raw || {});
  const title = oh.sectionHeadings?.blog?.title?.trim() || "เพจชุมชน";
  const desc =
    oh.sectionHeadings?.blog?.subtitle?.trim() ||
    "เพจชุมชน — ลิงก์และโพสต์จากผู้ดูแลเว็บ";
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
