import { publicMemberPath } from "./memberPublicUrls";

const LEGACY_BLOG_TITLES = new Set(["our recent blog", "our blog", "recent blog"]);

export function normalizeCommunityTitle(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return "เพจชุมชน";
  if (LEGACY_BLOG_TITLES.has(t.toLowerCase())) return "เพจชุมชน";
  return t;
}

export function postHasPublicContent(post) {
  if (!post || typeof post !== "object") return false;
  const t = String(post.title ?? "").trim();
  const u = String(post.imageUrl ?? "").trim();
  const ex = String(post.excerpt ?? "").trim();
  return Boolean(t || u || ex);
}

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

export function dedupeCommunityPosts(orderedPosts) {
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

export function memberDirectoryCard(m) {
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

/**
 * รายการโพสต์ล็อบบี้เดียวกับหน้า /page — ใช้บนหน้าแรกได้
 * @param {{ blogBlock?: object, communityPage?: object, memberPages?: unknown[] }} p
 */
export function buildCommunityLobbyPosts({ blogBlock, communityPage, memberPages }) {
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
  const lobbyPosts = dedupeCommunityPosts([...memberPosts, ...visiblePosts]);
  const viewAllHref = String(cp.viewAllHref || "").trim();
  const viewAllLabel = cp.viewAllLabel != null ? String(cp.viewAllLabel) : "ดูทั้งหมด";
  return { lobbyPosts, viewAllHref, viewAllLabel, title, sub };
}
