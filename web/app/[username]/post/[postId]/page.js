import { notFound } from "next/navigation";
import MemberStylePageShell from "../../../../components/MemberStylePageShell";
import MemberPublicSinglePostClient from "../../../../components/MemberPublicSinglePostClient";
import { getApiBase } from "../../../../lib/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const USERNAME_RE = /^[a-z0-9_]{3,32}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function fetchPublicPost(username, postId) {
  const base = getApiBase().replace(/\/$/, "");
  const r = await fetch(
    `${base}/api/public/members/${encodeURIComponent(username)}/posts/${encodeURIComponent(postId)}`,
    { cache: "no-store", headers: { Accept: "application/json" } }
  );
  if (!r.ok) return null;
  const data = await r.json().catch(() => ({}));
  if (!data.ok || !data.post) return null;
  return data.post;
}

export async function generateMetadata({ params }) {
  const un =
    typeof params?.username === "string" ? params.username.trim().toLowerCase() : "";
  const postId = typeof params?.postId === "string" ? params.postId.trim() : "";
  if (!USERNAME_RE.test(un) || !UUID_RE.test(postId)) {
    return { title: "โพสต์ | HUAJAIY" };
  }
  const post = await fetchPublicPost(un, postId);
  if (!post) {
    return { title: "โพสต์ | HUAJAIY" };
  }
  const title = String(post.title || "โพสต์").trim();
  const img = String(post.coverImageUrl || "").trim();
  const desc = `โพสต์จาก @${un} บน HUAJAIY`;
  return {
    title: `${title} | @${un} | HUAJAIY`,
    description: desc,
    openGraph: img
      ? { title, description: desc, images: [{ url: img }] }
      : { title, description: desc }
  };
}

export default async function MemberPublicPostPage({ params, searchParams }) {
  const un =
    typeof params?.username === "string" ? params.username.trim().toLowerCase() : "";
  const postId = typeof params?.postId === "string" ? params.postId.trim() : "";
  if (!USERNAME_RE.test(un) || !UUID_RE.test(postId)) {
    notFound();
  }
  const post = await fetchPublicPost(un, postId);
  if (!post) {
    notFound();
  }
  const refRaw = searchParams?.ref;
  const refUsername = typeof refRaw === "string" ? refRaw.trim() : "";

  return (
    <MemberStylePageShell>
      <MemberPublicSinglePostClient username={un} post={post} refUsername={refUsername} />
    </MemberStylePageShell>
  );
}
