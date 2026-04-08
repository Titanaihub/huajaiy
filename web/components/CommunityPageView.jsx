import Link from "next/link";
import CommunityLobby from "./CommunityLobby";
import { buildCommunityLobbyPosts } from "../lib/communityLobbyPosts";

function SmartLink({ href, className, children }) {
  const h = String(href || "").trim();
  if (!h || h === "#") {
    return <span className={className}>{children}</span>;
  }
  if (/^https:\/\//i.test(h)) {
    return (
      <a href={h} className={className} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={h} className={className}>
      {children}
    </Link>
  );
}

/**
 * เนื้อหาเพจชุมชน — โครงเดียวกับหน้า /game (หัวข้อ + ล็อบบี้การ์ด + ทางลัด)
 */
export default function CommunityPageView({ blogBlock, communityPage, memberPages = [] }) {
  const { lobbyPosts, viewAllHref, viewAllLabel, title, sub } = buildCommunityLobbyPosts({
    blogBlock,
    communityPage,
    memberPages
  });
  const showViewAll = viewAllHref && viewAllHref !== "#";

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div
        id="member-pages"
        className="mb-8 scroll-mt-28 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--gl-page-heading)]">
            {title}
          </h1>
          {sub ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--gl-card-muted)]">
              {sub}
            </p>
          ) : null}
        </div>
        {showViewAll ? (
          <SmartLink
            href={viewAllHref}
            className="shrink-0 rounded-xl border border-[color:var(--gl-card-border)] bg-[var(--gl-card-bg)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--gl-card-cta)] shadow-sm transition hover:border-[color:var(--gl-card-cta-hover)] hover:text-[var(--gl-card-cta-hover)]"
          >
            {viewAllLabel || "ดูทั้งหมด"}
          </SmartLink>
        ) : null}
      </div>

      <div id="community-lobby" className="scroll-mt-24">
        <CommunityLobby posts={lobbyPosts} />
      </div>

      <nav
        className="mt-10 flex flex-wrap items-center gap-x-1 gap-y-2 border-t border-[color:var(--gl-card-border)] pt-8"
        aria-label="ทางลัดจากเพจชุมชน"
      >
        <Link
          href="/"
          className="shrink-0 whitespace-nowrap rounded-lg px-2 py-1 text-sm font-medium text-[var(--gl-footer-nav)] transition hover:bg-black/[0.04] hover:text-[var(--gl-footer-nav-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 focus-visible:ring-offset-2"
        >
          ← หน้าแรก
        </Link>
        <Link
          href="/game"
          className="shrink-0 whitespace-nowrap rounded-lg px-2 py-1 text-sm font-medium text-[var(--gl-footer-nav)] transition hover:bg-black/[0.04] hover:text-[var(--gl-footer-nav-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 focus-visible:ring-offset-2"
        >
          เกมและรางวัล
        </Link>
        <Link
          href="/shop"
          className="shrink-0 whitespace-nowrap rounded-lg px-2 py-1 text-sm font-medium text-[var(--gl-footer-nav)] transition hover:bg-black/[0.04] hover:text-[var(--gl-footer-nav-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 focus-visible:ring-offset-2"
        >
          ร้านค้า
        </Link>
        <Link
          href="/cart"
          className="shrink-0 whitespace-nowrap rounded-lg px-2 py-1 text-sm font-medium text-[var(--gl-footer-nav)] transition hover:bg-black/[0.04] hover:text-[var(--gl-footer-nav-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 focus-visible:ring-offset-2"
        >
          ตะกร้า
        </Link>
      </nav>
    </main>
  );
}
