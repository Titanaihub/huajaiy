import CommunityPageRoute, {
  getCommunityPageMetadata
} from "../../components/CommunityPageRoute";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
  return getCommunityPageMetadata();
}

export default async function CommunityPostsPage() {
  return (
    <CommunityPageRoute activeNavKey="posts" scrollToSection="lobby" />
  );
}
