import Link from "next/link";

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

export default function CommunityPageView({ blogBlock, communityPage }) {
  const title = blogBlock?.title?.trim() || "เพจชุมชน";
  const sub = blogBlock?.subtitle?.trim() || "";
  const titleColor = blogBlock?.titleColor || "#212529";
  const subColor = blogBlock?.subtitleColor || "#6C757D";
  const cp = communityPage && typeof communityPage === "object" ? communityPage : {};
  const posts = Array.isArray(cp.posts) ? cp.posts : [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="hui-h2" style={{ color: titleColor }}>
            {title}
          </h1>
          {sub ? (
            <p className="mt-2 text-base" style={{ color: subColor }}>
              {sub}
            </p>
          ) : null}
        </div>
        <SmartLink
          href={cp.viewAllHref}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-hui-cta px-4 text-sm font-semibold text-white shadow-soft hover:brightness-95"
        >
          {cp.viewAllLabel || "ดูทั้งหมด"}
        </SmartLink>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {posts.slice(0, 3).map((post, i) => {
          const src = resolveCommunityImageSrc(post?.imageUrl);
          const phref = post?.href;
          const hasNav =
            phref != null && String(phref).trim() && String(phref).trim() !== "#";
          return (
            <article
              key={i}
              className="flex flex-col overflow-hidden rounded-2xl border border-hui-border bg-hui-surface/90 shadow-soft"
            >
              <div className="aspect-[16/10] overflow-hidden bg-hui-pageTop">
                {src ? (
                  hasNav ? (
                    <SmartLink href={phref} className="block h-full w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
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
              <div className="flex flex-1 flex-col p-4">
                <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs uppercase tracking-wide text-hui-muted">
                  <span>{post?.dateLine}</span>
                  <span>{post?.category}</span>
                </div>
                <h2 className="text-base font-semibold text-hui-section">
                  <SmartLink
                    href={phref}
                    className="text-hui-section decoration-hui-border/60 underline-offset-2 hover:text-hui-cta hover:underline"
                  >
                    {post?.title}
                  </SmartLink>
                </h2>
                {post?.excerpt ? (
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-hui-body line-clamp-4">
                    {post.excerpt}
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      <p className="hui-note mt-8 text-sm">
        เนื้อหาและรูปแก้ได้ที่แอดมิน → ธีมเว็บ → ชุมชนเพจ
      </p>
      <Link
        href="/"
        className="mt-4 inline-flex text-sm font-medium text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
      >
        ← หน้าแรก
      </Link>
    </main>
  );
}
