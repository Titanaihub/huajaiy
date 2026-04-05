import { notFound, permanentRedirect } from "next/navigation";

const USERNAME_RE = /^[a-z0-9_]{3,32}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** ลิงก์เก่า /u/{username}/post/{id} → /{username}/post/{id} */
export default function LegacyPublicPostRedirect({ params, searchParams }) {
  const un =
    typeof params?.username === "string" ? params.username.trim().toLowerCase() : "";
  const postId = typeof params?.postId === "string" ? params.postId.trim() : "";
  if (!USERNAME_RE.test(un) || !UUID_RE.test(postId)) {
    notFound();
  }
  const refRaw = searchParams?.ref;
  const ref = typeof refRaw === "string" ? refRaw.trim() : "";
  const qs = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  permanentRedirect(`/${un}/post/${postId}${qs}`);
}
