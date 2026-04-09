import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
import { getApiBase } from "../../../lib/config";
import { siteNavLinkClass } from "../../../lib/siteNavLinkClass";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function fetchPublishedPage(slug) {
  const base = getApiBase().replace(/\/$/, "");
  const r = await fetch(
    `${base}/api/public/cms-pages/${encodeURIComponent(slug)}`,
    { cache: "no-store", headers: { Accept: "application/json" } }
  );
  if (r.status === 404) return null;
  if (!r.ok) return null;
  const data = await r.json().catch(() => ({}));
  if (!data.ok || !data.page) return null;
  return data.page;
}

export async function generateMetadata({ params }) {
  const raw = params?.slug;
  const slug = typeof raw === "string" ? raw.trim() : "";
  const page = slug ? await fetchPublishedPage(slug) : null;
  if (!page) {
    return { title: "หน้า | HUAJAIY" };
  }
  const desc =
    page.body && String(page.body).trim()
      ? String(page.body).trim().slice(0, 160)
      : undefined;
  return {
    title: `${page.title} | HUAJAIY`,
    description: desc
  };
}

export default async function PublicCmsPage({ params }) {
  const raw = params?.slug;
  const slug = typeof raw === "string" ? raw.trim() : "";
  if (!slug) notFound();
  const page = await fetchPublishedPage(slug);
  if (!page) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="hui-h2">{page.title}</h1>
        <div className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-hui-body">
          {page.body}
        </div>
        <Link href="/" className={`${siteNavLinkClass} mt-10 inline-flex`}>
          ← หน้าแรก
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
