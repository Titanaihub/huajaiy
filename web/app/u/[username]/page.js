import Link from "next/link";
import { notFound } from "next/navigation";
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
    return { title: "สมาชิก | HUAJAIY" };
  }
  const m = await fetchPublicMember(un);
  if (!m) {
    return { title: "สมาชิก | HUAJAIY" };
  }
  const name = String(m.displayName || m.username || "").trim() || m.username;
  return {
    title: `${name} (@${m.username}) | HUAJAIY`,
    description: `หน้าสาธารณะของ @${m.username} บน HUAJAIY`
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
  const displayName =
    String(m.displayName || "").trim() || `@${m.username}`;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-8 sm:py-10">
        <p className="text-sm text-hui-muted">
          <Link
            href="/"
            className="font-medium text-hui-cta underline decoration-hui-cta/40 underline-offset-2 hover:brightness-95"
          >
            ← หน้าแรก
          </Link>
          <span className="mx-2 text-hui-border" aria-hidden>
            ·
          </span>
          <Link
            href="/game"
            className="font-medium text-hui-cta underline decoration-hui-cta/40 underline-offset-2 hover:brightness-95"
          >
            รายการเกม
          </Link>
        </p>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-hui-section">
          {displayName}
        </h1>
        <p className="mt-1 text-sm text-hui-muted">@{m.username}</p>
      </main>
      <SiteFooter />
    </>
  );
}
