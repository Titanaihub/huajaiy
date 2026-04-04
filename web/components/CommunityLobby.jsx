"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DEFAULT_CENTRAL_GAME_COVER_PATH } from "../lib/centralGameDefaults";

const DESC_LEN = 180;

function clipDescription(text) {
  const s = String(text || "").trim();
  if (s.length <= DESC_LEN) return s;
  return `${s.slice(0, DESC_LEN).trim()}…`;
}

function resolveCommunityImageSrc(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  if (/^https:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return u;
  if (/^images\//i.test(u)) return `/organic-template/${u}`;
  return u;
}

function isNavigableHref(href) {
  const h = String(href || "").trim();
  return Boolean(h && h !== "#");
}

function CardInner({ post, cardClass, mediaShell }) {
  const src = resolveCommunityImageSrc(post?.imageUrl);
  const phref = post?.href;
  const hasNav = isNavigableHref(phref);
  const category = String(post?.category || "").trim();
  const dateLine = String(post?.dateLine || "").trim();

  const media = (
    <div className={mediaShell}>
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src || DEFAULT_CENTRAL_GAME_COVER_PATH}
          alt=""
          className="max-h-full max-w-full object-contain transition duration-200 group-hover:opacity-95"
          width={640}
          height={360}
        />
      </div>
    </div>
  );

  const body = (
    <>
      {media}
      <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-4">
        <h2 className="line-clamp-2 text-base font-semibold leading-snug text-[var(--gl-card-title)]">
          {post?.title || "โพสต์"}
        </h2>
        <p className="mt-1.5 text-sm text-[var(--gl-card-muted)]">
          หมวด:{" "}
          <span className="font-medium text-[var(--gl-card-body)]">{category || "—"}</span>
        </p>
        {dateLine ? (
          <p className="mt-1 text-sm font-medium text-[var(--gl-card-heart)] line-clamp-2">
            {dateLine}
          </p>
        ) : null}
        {post?.excerpt ? (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--gl-card-body)]">
            {clipDescription(post.excerpt)}
          </p>
        ) : (
          <p className="mt-2 text-sm italic text-[var(--gl-card-muted)]">ไม่มีคำอธิบายสั้น</p>
        )}
        <span className="mt-auto border-t border-[color:var(--gl-card-border)] pt-3 text-center text-sm font-semibold text-[var(--gl-card-cta)] group-hover:text-[var(--gl-card-cta-hover)]">
          {hasNav ? "เปิดโพสต์นี้" : "ยังไม่มีลิงก์"}
        </span>
      </div>
    </>
  );

  if (hasNav && /^https:\/\//i.test(String(phref))) {
    return (
      <a href={phref} className={cardClass} target="_blank" rel="noopener noreferrer">
        {body}
      </a>
    );
  }
  if (hasNav) {
    return (
      <Link href={phref} className={cardClass}>
        {body}
      </Link>
    );
  }
  return <div className={cardClass}>{body}</div>;
}

/**
 * ล็อบบี้เพจชุมชน — โครงเดียวกับ GameLobby (ค้นหา + การ์ด + CSS vars ธีมหน้าเกม)
 * @param {{ posts: Array<object> }} props
 */
export default function CommunityLobby({ posts = [] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return posts;
    return posts.filter((p) => {
      const title = String(p?.title || "").toLowerCase();
      const ex = String(p?.excerpt || "").toLowerCase();
      const cat = String(p?.category || "").toLowerCase();
      return title.includes(needle) || ex.includes(needle) || cat.includes(needle);
    });
  }, [posts, q]);

  const cardShell =
    "group flex h-full flex-col overflow-hidden rounded-2xl border text-left shadow-sm transition hover:shadow-md";
  const cardClass = `${cardShell} border-[color:var(--gl-card-border)] bg-[var(--gl-card-bg)] hover:border-[color:var(--gl-card-cta-hover)]`;
  const mediaShell =
    "relative aspect-video w-full overflow-hidden rounded-t-2xl border-b border-[color:var(--gl-card-border)] bg-[var(--gl-card-media-bg)]";

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="community-search" className="text-sm font-medium text-[var(--gl-search-label)]">
          ค้นหาหัวข้อ คำอธิบาย หรือหมวด
        </label>
        <input
          id="community-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="พิมพ์คำค้น…"
          className="mt-1.5 w-full rounded-2xl border border-[color:var(--gl-search-border)] bg-[var(--gl-search-bg)] px-4 py-3 text-base text-[var(--gl-search-text)] shadow-sm outline-none placeholder:text-[var(--gl-search-ph)] focus:border-[color:var(--gl-card-heart)] focus:ring-2 focus:ring-rose-300/35 sm:text-sm"
          autoComplete="off"
        />
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-[color:var(--gl-card-border)] bg-[var(--gl-card-bg)] p-8 text-center text-sm text-[var(--gl-empty-text)] shadow-sm">
          <p className="font-medium text-[var(--gl-empty-text)]">ยังไม่มีโพสต์ในหน้านี้</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--gl-empty-muted)]">
            แอดมินตั้งค่าได้ที่ <span className="font-medium">ธีมเว็บ → ชุมชนเพจ</span>
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-[var(--gl-card-muted)]">ไม่พบโพสต์ที่ตรงกับคำค้น</p>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((post, i) => (
            <li key={i}>
              <CardInner post={post} cardClass={cardClass} mediaShell={mediaShell} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
