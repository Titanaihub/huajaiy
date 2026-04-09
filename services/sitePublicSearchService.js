const centralGameService = require("./centralGameService");
const userService = require("./userService");
const memberPublicPostService = require("./memberPublicPostService");
const productService = require("./productService");

const MAX_Q = 80;
const LIMIT_EACH = 12;

function normalizeQuery(raw) {
  return String(raw ?? "")
    .trim()
    .slice(0, MAX_Q);
}

function matchesHaystack(hay, needle) {
  if (!needle) return false;
  const h = String(hay ?? "").toLowerCase();
  const n = needle.toLowerCase();
  return h.includes(n);
}

/**
 * ค้นหาสาธารณะรวม: เกมกลาง, เพจสมาชิก, โพสต์, สินค้า
 * @param {string} rawQ
 */
async function searchSitePublic(rawQ) {
  const q = normalizeQuery(rawQ);
  const empty = {
    ok: true,
    q,
    games: [],
    memberPages: [],
    posts: [],
    products: []
  };
  if (!q) return empty;

  const gamesP = (async () => {
    try {
      const all = await centralGameService.listPublishedGamesForPublic();
      return (Array.isArray(all) ? all : [])
        .filter(
          (g) =>
            matchesHaystack(g.title, q) ||
            matchesHaystack(g.description, q) ||
            matchesHaystack(g.creatorUsername, q) ||
            matchesHaystack(g.gameCode, q)
        )
        .slice(0, LIMIT_EACH)
        .map((g) => ({
          id: g.id,
          gameCode: g.gameCode || null,
          title: g.title,
          description: g.description,
          gameCoverUrl: g.gameCoverUrl,
          creatorUsername: g.creatorUsername
        }));
    } catch (e) {
      if (e.code === "DB_REQUIRED") return [];
      throw e;
    }
  })();

  const membersP = userService.searchPublicMemberDirectory(q, LIMIT_EACH);
  const postsP = memberPublicPostService.searchPublicPostsForSiteSearch(
    q,
    LIMIT_EACH
  );
  const productsP = (async () => {
    try {
      const r = await productService.listPublic({
        q,
        limit: LIMIT_EACH,
        offset: 0
      });
      return (r && r.products) || [];
    } catch (e) {
      if (e.code === "DB_REQUIRED") return [];
      throw e;
    }
  })();

  const [games, memberPages, posts, products] = await Promise.all([
    gamesP,
    membersP,
    postsP,
    productsP
  ]);

  return {
    ok: true,
    q,
    games,
    memberPages,
    posts,
    products
  };
}

module.exports = { searchSitePublic };
