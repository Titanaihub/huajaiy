import Link from "next/link";

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

function resolveCommunityImageSrc(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  if (/^https:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return u;
  if (/^images\//i.test(u)) return `/organic-template/${u}`;
  return u;
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

/**
 * เทมเพลตเพจชุมชน (เวอร์ชันใหม่) — แยกจากหน้าภายในเดิม: พื้นเรียบที่ layout + โครงสร้างใหม่
 */
export default function CommunityPageView({ blogBlock, communityPage }) {
  const rawTitle = blogBlock?.title?.trim() || "";
  const title = normalizeCommunityTitle(rawTitle);
  const rawSub = blogBlock?.subtitle?.trim() || "";
  const sub =
    rawSub && !rawSub.toLowerCase().includes("lorem ipsum") ? rawSub : "";
  const titleColor = blogBlock?.titleColor || "#3d1528";
  const subColor = blogBlock?.subtitleColor || "#6b4a5a";
  const cp = communityPage && typeof communityPage === "object" ? communityPage : {};
  const posts = Array.isArray(cp.posts) ? cp.posts : [];
  const visiblePosts = posts.filter(postHasPublicContent);

  return (
    <main className="relative flex-1 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(42vh,320px)] bg-gradient-to-b from-rose-200/45 via-pink-100/25 to-transparent"
        aria-hidden
      />
      <div className="pointer-events-none absolute -right-24 top-24 h-64 w-64 rounded-full bg-rose-300/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -left-16 top-40 h-48 w-48 rounded-full bg-fuchsia-200/20 blur-3xl" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <header className="mb-12 flex flex-col gap-8 border-b border-rose-900/10 pb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-rose-700/80">
              HUAJAIY · ชุมชน
            </p>
            <h1
              className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.35rem]"
              style={{ color: titleColor }}
            >
              {title}
            </h1>
            {sub ? (
              <p className="mt-3 text-base leading-relaxed sm:text-lg" style={{ color: subColor }}>
                {sub}
              </p>
            ) : (
              <p className="mt-3 text-base leading-relaxed text-rose-950/55">
                อัปเดตกิจกรรม ลิงก์แนะนำ และข่าวจากทีมงาน
              </p>
            )}
          </div>
          <SmartLink
            href={cp.viewAllHref}
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-rose-600 to-rose-700 px-8 text-sm font-semibold text-white shadow-lg shadow-rose-900/15 transition hover:brightness-105 hover:shadow-xl"
          >
            {cp.viewAllLabel || "ดูทั้งหมด"}
          </SmartLink>
        </header>

        {visiblePosts.length === 0 ? (
          <div className="mx-auto max-w-lg rounded-3xl border border-white/80 bg-white/85 px-8 py-14 text-center shadow-xl shadow-rose-900/5 backdrop-blur-md">
            <div
              className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-pink-50 text-3xl"
              aria-hidden
            >
              💬
            </div>
            <p className="text-base font-medium text-rose-950/90">ยังไม่มีโพสต์ในหน้านี้</p>
            <p className="mt-2 text-sm leading-relaxed text-rose-950/55">
              แอดมินสามารถเพิ่มหัวข้อ รูป และลิงก์ได้ที่{" "}
              <span className="font-medium text-rose-800/90">ธีมเว็บ → ชุมชนเพจ</span>
            </p>
          </div>
        ) : (
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePosts.slice(0, 3).map((post, i) => {
              const src = resolveCommunityImageSrc(post?.imageUrl);
              const phref = post?.href;
              const hasNav =
                phref != null && String(phref).trim() && String(phref).trim() !== "#";
              return (
                <li key={i}>
                  <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-white/90 bg-white/90 shadow-lg shadow-rose-900/6 ring-1 ring-rose-900/[0.04] backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-rose-900/10">
                    <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-rose-50 to-pink-50">
                      {src ? (
                        hasNav ? (
                          <SmartLink href={phref} className="block h-full w-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={src}
                              alt=""
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                            />
                          </SmartLink>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={src}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-wider text-rose-800/50">
                        {post?.dateLine ? <span>{post.dateLine}</span> : null}
                        {post?.category ? <span className="text-rose-700/70">{post.category}</span> : null}
                      </div>
                      <h2 className="text-lg font-semibold leading-snug text-rose-950">
                        <SmartLink
                          href={phref}
                          className="text-rose-950 decoration-rose-300/80 underline-offset-4 hover:text-rose-700 hover:underline"
                        >
                          {post?.title}
                        </SmartLink>
                      </h2>
                      {post?.excerpt ? (
                        <p className="mt-3 flex-1 text-sm leading-relaxed text-rose-950/65 line-clamp-4">
                          {post.excerpt}
                        </p>
                      ) : null}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-14 flex flex-col gap-4 border-t border-rose-900/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-rose-950/45">
            แก้หัวข้อ คำอธิบาย รูป และลิงก์ได้ที่แอดมิน → ธีมเว็บ → ชุมชนเพจ
          </p>
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-rose-900/15 bg-white/70 px-5 py-2.5 text-sm font-medium text-rose-900/85 shadow-sm backdrop-blur-sm transition hover:border-rose-700/30 hover:bg-white"
          >
            <span aria-hidden>←</span>
            หน้าแรก
          </Link>
        </div>
      </div>
    </main>
  );
}
