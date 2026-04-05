import { notFound } from "next/navigation";
import MemberStylePageShell from "../../components/MemberStylePageShell";
import PublicMemberPageChrome from "../../components/PublicMemberPageChrome";
import { getApiBase } from "../../lib/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const USERNAME_RE = /^[a-z0-9_]{3,32}$/;

async function fetchPublicMember(username) {
  const base = getApiBase().replace(/\/$/, "");
  const r = await fetch(
    `${base}/api/public/members/${encodeURIComponent(username)}`,
    { cache: "no-store", headers: { Accept: "application/json" } }
  );
  if (!r.ok) return null;
  const data = await r.json().catch(() => ({}));
  if (!data.ok) return null;
  return data;
}

async function fetchPublicMemberPosts(username) {
  const base = getApiBase().replace(/\/$/, "");
  const r = await fetch(
    `${base}/api/public/members/${encodeURIComponent(username)}/posts`,
    { cache: "no-store", headers: { Accept: "application/json" } }
  );
  if (!r.ok) return [];
  const data = await r.json().catch(() => ({}));
  if (!data.ok || !Array.isArray(data.posts)) return [];
  return data.posts;
}

export async function generateMetadata({ params }) {
  const raw = params?.username;
  const un = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!USERNAME_RE.test(un)) {
    return { title: "เพจสมาชิก | HUAJAIY" };
  }
  const m = await fetchPublicMember(un);
  if (!m) {
    return { title: "เพจสมาชิก | HUAJAIY" };
  }
  const pageTitle = String(m.publicPageTitle || "").trim();
  const legal = String(m.displayName || m.username || "").trim();
  const name = pageTitle || legal || m.username;
  const bio = String(m.publicPageBio || "").trim();
  const desc =
    bio && bio.length <= 160
      ? bio
      : bio
        ? `${bio.slice(0, 157).trim()}…`
        : `เพจของ @${m.username} บน HUAJAIY — เกมและโปรไฟล์`;
  return {
    title: `${name} (@${m.username}) | HUAJAIY`,
    description: desc
  };
}

export default async function PublicMemberPage({ params }) {
  const raw = params?.username;
  const un = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!USERNAME_RE.test(un)) {
    notFound();
  }
  const m = await fetchPublicMember(un);
  if (!m) {
    notFound();
  }
  const initialPosts = await fetchPublicMemberPosts(un);

  return (
    <MemberStylePageShell>
      <PublicMemberPageChrome member={m} initialPosts={initialPosts} />
    </MemberStylePageShell>
  );
}
