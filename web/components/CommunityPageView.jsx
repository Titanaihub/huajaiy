import { randomInt } from "crypto";
import Link from "next/link";
import CommunityLobby from "./CommunityLobby";
import { DEFAULT_CENTRAL_GAME_COVER_PATH } from "../lib/centralGameDefaults";
import { publicMemberPath } from "../lib/memberPublicUrls";

const LEGACY_BLOG_TITLES = new Set([
  "our recent blog",
  "our blog",
  "recent blog"
]);

function normalizeCommunityTitle(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return "เพจชุมชน";
  if (LEGACY_BLOG_TITLES.has(t.toLowerCase())) return "เพจชุมชน";
  return t;
}

function postHasPublicContent(post) {
  if (!post || typeof post !== "object") return false;
  const t = String(post.title ?? "").trim();
  const u = String(post.imageUrl ?? "").trim();
  const ex = String(post.excerpt ?? "").trim();
  return Boolean(t || u || ex);
}

/** ลิงก์เดียวกัน (เช่น /username) ไม่แสดงซ้ำ — คงรายการจาก member API ก่อน */
function communityPostDedupeKey(post) {
  const h = String(post?.href ?? "").trim();
  if (h && h !== "#") {
    try {
      let path = h.split("?")[0].replace(/\/+$/, "");
      if (/^https?:\/\//i.test(path)) {
        path = new URL(path).pathname || path;
      }
      path = path.toLowerCase();
      return path || `href:${h}`;
    } catch {
      return h.toLowerCase();
    }
  }
  const t = String(post?.title ?? "").trim();
  const u = String(post?.imageUrl ?? "").trim();
  return `raw:${t}|${u}`;
}

function dedupeCommunityPosts(orderedPosts) {
  const seen = new Set();
  const out = [];
  for (const p of orderedPosts) {
    if (!p || typeof p !== "object") continue;
    const k = communityPostDedupeKey(p);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

const MEMBER_EXCERPT_LEN = 200;

function memberDirectoryCard(m) {
  const un = String(m?.username || "").trim();
  if (!un) return null;
  const bio = String(m?.publicPageBio || "").trim();
  let excerpt = bio;
  if (excerpt.length > MEMBER_EXCERPT_LEN) {
    excerpt = `${excerpt.slice(0, MEMBER_EXCERPT_LEN).trim()}…`;
  }
  const img =
    String(m?.publicPageCoverUrl || "").trim() ||
    String(m?.profilePictureUrl || "").trim() ||
    "";
  const title =
    String(m?.pageTitle || "").trim() ||
    String(m?.displayName || un).trim() ||
    un;
  return {
    title,
    category: "เพจสมาชิก",
    dateLine: `@${un}`,
    excerpt,
    imageUrl: img,
    href: publicMemberPath(un)
  };
}

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

function resolveCommunitySpotlightImageSrc(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  if (/^https:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return u;
  if (/^images\//i.test(u)) return `/organic-template/${u}`;
  return u;
}

const SPOT_DESC_LEN = 180;

function clipSpotlightExcerpt(text) {
  const s = String(text || "").trim();
  if (s.length <= SPOT_DESC_LEN) return s;
  return `${s.slice(0, SPOT_DESC_LEN).trim()}…`;
}

function pickRandomUniqueCommunityPosts(posts, n) {
  const pool = [...posts];
  const out = [];
  const take = Math.min(n, pool.length);
  for (let i = 0; i < take; i++) {
    const j = randomInt(0, pool.length);
    out.push(pool[j]);
    pool.splice(j, 1);
  }
  return out;
}

/** การ์ดโพสต์สุ่มใต้หัวข้อเพจชุมชน — สไตล์ใกล้เคียง CommunityLobby */
function CommunitySpotlightCard({ post }) {
  const phref = String(post?.href || "").trim();
  const hasNav = phref && phref !== "#";
  const src = resolveCommunitySpotlightImageSrc(post?.imageUrl);
  const imgSrc = src || DEFAULT_CENTRAL_GAME_COVER_PATH;
  const cardShell =
    "group flex h-full flex-col overflow-hidden rounded-2xl border text-left shadow-sm transition hover:shadow-md border-[color:var(--gl-card-border)] bg-[var(--gl-card-bg)] hover:border-[color:var(--gl-card-cta-hover)]";
  const mediaShell =
    "relative aspect-[10/3] w-full shrink-0 overflow-hidden rounded-t-2xl border-b border-[color:var(--gl-card-border)] bg-[var(--gl-card-media-bg)]";
  const inner = (
    <>
      <div className={mediaShell}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt=""
          width={1000}
          height={300}
          className="h-full w-full object-cover object-center transition duration-200 group-hover:opacity-95"
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col bg-[var(--gl-card-bg)] p-3 sm:p-3.5">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--gl-card-muted)]">
          <span className="truncate">{String(post?.dateLine || "").trim() || "—"}</span>
          <span className="mx-2 opacity-40">·</span>
          <span>{String(post?.category || "").trim() || "—"}</span>
        </div>
        <h2 className="mt-2.5 line-clamp-2 text-base font-bold leading-snug text-[var(--gl-card-title)] sm:text-lg">
          {post?.title || "โพสต์"}
        </h2>
        {post?.excerpt ? (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--gl-card-body)]">
            {clipSpotlightExcerpt(post.excerpt)}
          </p>
        ) : null}
      </div>
    </>
  );
  if (hasNav && /^https:\/\//i.test(phref)) {
    return (
      <a href={phref} className={cardShell} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }
  if (hasNav) {
    return (
      <Link href={phref} className={cardShell}>
        {inner}
      </Link>
    );
  }
  return <div className={cardShell}>{inner}</div>;
}

/**
 * เนื้อหาเพจชุมชน — โครงเดียวกับหน้า /game (หัวข้อ + ล็อบบี้การ์ด + ทางลัด)
 */
export default function CommunityPageView({
  blogBlock,
  communityPage,
  memberPages = []
}) {
  const rawTitle = blogBlock?.title?.trim() || "";
  const title = normalizeCommunityTitle(rawTitle);
  const rawSub = blogBlock?.subtitle?.trim() || "";
  const sub =
    rawSub && !rawSub.toLowerCase().includes("lorem ipsum") ? rawSub : "";
  const cp = communityPage && typeof communityPage === "object" ? communityPage : {};
  const posts = Array.isArray(cp.posts) ? cp.posts : [];
  const visiblePosts = posts.filter(postHasPublicContent);
  const memberPosts = (Array.isArray(memberPages) ? memberPages : [])
    .map(memberDirectoryCard)
    .filter(Boolean)
    .filter(postHasPublicContent);
  const memberLobbyPosts = dedupeCommunityPosts(memberPosts);
  const themeLobbyPosts = dedupeCommunityPosts(visiblePosts);
  /** สุ่มเฉพาะโพสต์จากธีมชุมชน — ไม่ปนกับการ์ดเพจสมาชิก */
  const postSpotlightPick =
    themeLobbyPosts.length > 0
      ? pickRandomUniqueCommunityPosts(themeLobbyPosts, 3)
      : [];
  const viewHref = String(cp.viewAllHref || "").trim();
  const showViewAll = viewHref && viewHref !== "#";

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
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
            href={viewHref}
            className="shrink-0 rounded-xl border border-[color:var(--gl-card-border)] bg-[var(--gl-card-bg)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--gl-card-cta)] shadow-sm transition hover:border-[color:var(--gl-card-cta-hover)] hover:text-[var(--gl-card-cta-hover)]"
          >
            {cp.viewAllLabel || "ดูทั้งหมด"}
          </SmartLink>
        ) : null}
      </div>

      {postSpotlightPick.length > 0 ? (
        <section className="mb-10" aria-label="โพสต์สุ่มจากชุมชน">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--gl-page-heading)]">
            โพสต์สุ่ม
          </h2>
          <p className="mt-1 text-xs text-[var(--gl-card-muted)]">
            จากเนื้อหาที่แอดมินตั้งในเพจชุมชน — ไม่ใช่รายการเพจสมาชิก
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {postSpotlightPick.map((post, i) => (
              <li key={`spot-${communityPostDedupeKey(post)}-${i}`}>
                <CommunitySpotlightCard post={post} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mb-10 space-y-4" aria-labelledby="community-member-pages-heading">
        <h2
          id="community-member-pages-heading"
          className="text-lg font-semibold tracking-tight text-[var(--gl-page-heading)]"
        >
          เพจสมาชิก
        </h2>
        <p className="text-xs text-[var(--gl-card-muted)]">
          สมาชิกที่กดเผยแพร่เพจแล้ว — แต่ละการ์ดคือเพจคน ไม่ใช่โพสต์บทความ
        </p>
        <CommunityLobby
          posts={memberLobbyPosts}
          searchInputId="community-search-member-pages"
          searchLabel="ค้นหาเพจสมาชิก (ชื่อ คำอธิบาย หรือ @)"
          emptyTitle="ยังไม่มีเพจสมาชิกที่เผยแพร่"
          emptyHint="เมื่อสมาชิกเปิดเผยแพร่เพจสาธารณะ รายชื่อจะแสดงที่นี่"
        />
      </section>

      <section className="space-y-4" aria-labelledby="community-theme-posts-heading">
        <h2
          id="community-theme-posts-heading"
          className="text-lg font-semibold tracking-tight text-[var(--gl-page-heading)]"
        >
          โพสต์จากชุมชน
        </h2>
        <p className="text-xs text-[var(--gl-card-muted)]">
          บทความหรือกิจกรรมที่แอดมินตั้งในธีมเว็บ → ชุมชนเพจ
        </p>
        <CommunityLobby
          posts={themeLobbyPosts}
          searchInputId="community-search-theme-posts"
          searchLabel="ค้นหาโพสต์ (หัวข้อ คำอธิบาย หมวด)"
          emptyTitle="ยังไม่มีโพสต์ในหน้านี้"
          emptyHint="แอดมินตั้งค่าได้ที่ ธีมเว็บ → ชุมชนเพจ"
        />
      </section>

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
          href="/cart"
          className="shrink-0 whitespace-nowrap rounded-lg px-2 py-1 text-sm font-medium text-[var(--gl-footer-nav)] transition hover:bg-black/[0.04] hover:text-[var(--gl-footer-nav-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 focus-visible:ring-offset-2"
        >
          ตะกร้า
        </Link>
      </nav>
    </main>
  );
}
