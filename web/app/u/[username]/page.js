import { notFound } from "next/navigation";
import PublicMemberPageChrome from "../../../components/PublicMemberPageChrome";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
import { getApiBase } from "../../../lib/config";

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
  const name = String(m.displayName || m.username || "").trim() || m.username;
  return {
    title: `${name} (@${m.username}) | HUAJAIY`,
    description: `เพจของ @${m.username} บน HUAJAIY — เกมและโปรไฟล์`
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

  return (
    <>
      <SiteHeader />
      <main>
        <PublicMemberPageChrome member={m} />
      </main>
      <SiteFooter />
    </>
  );
}
