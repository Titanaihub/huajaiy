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

function communityCardListKey(post, index) {
  const h = String(post?.href || "").trim();
  if (h && h !== "#") return h;
  const t = String(post?.title || "").trim();
  const u = String(post?.imageUrl || "").trim();
  if (t || u) return `card:${t}|${u}`;
  return `card-fallback-${index}`;
}

function MetaCalendarIcon({ className }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function MetaFolderIcon({ className }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  );
}

/** แบนเนอร์แนวนอนกว้าง (~10:3 ใกล้ปกโปรโมชัน/แบนเนอร์เพจ) → เมตา → หัวข้อ → คำอธิบาย */
function CardInner({ post, cardClass, mediaShell }) {
  const src = resolveCommunityImageSrc(post?.imageUrl);
  const phref = post?.href;
  const hasNav = isNavigableHref(phref);
  const category = String(post?.category || "").trim();
  const dateLine = String(post?.dateLine || "").trim();

  const media = (
    <div className={mediaShell}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src || DEFAULT_CENTRAL_GAME_COVER_PATH}
        alt=""
        className="h-full w-full object-cover object-center transition duration-200 group-hover:opacity-95"
        width={1000}
        height={300}
      />
    </div>
  );

  const body = (
    <>
      {media}
      <div className="flex min-h-0 flex-1 flex-col bg-[var(--gl-card-bg)] p-3 sm:p-3.5">
        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase leading-none tracking-wide text-[var(--gl-card-muted)]">
          <div className="flex min-w-0 items-center gap-1.5">
            <MetaCalendarIcon className="shrink-0 opacity-85" />
            <span className="truncate">{dateLine || "—"}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <MetaFolderIcon className="shrink-0 opacity-85" />
            <span>{category || "—"}</span>
          </div>
        </div>
        <h2 className="mt-2.5 line-clamp-2 text-base font-bold leading-snug text-[var(--gl-card-title)] sm:text-lg">
          {post?.title || "โพสต์"}
        </h2>
        {post?.excerpt ? (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--gl-card-body)]">
            {clipDescription(post.excerpt)}
          </p>
        ) : null}
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
      const dateLine = String(p?.dateLine || "").toLowerCase();
      return (
        title.includes(needle) ||
        ex.includes(needle) ||
        cat.includes(needle) ||
        dateLine.includes(needle)
      );
    });
  }, [posts, q]);

  const cardShell =
    "group flex h-full flex-col overflow-hidden rounded-2xl border text-left shadow-sm transition hover:shadow-md";
  const cardClass = `${cardShell} border-[color:var(--gl-card-border)] bg-[var(--gl-card-bg)] hover:border-[color:var(--gl-card-cta-hover)]`;
  /* แบนเนอร์แนวนอนกว้าง ~10:3 — โชว์รูปปกเพจแบบแบนเนอร์ (ไม่ใช่จัตุรัส) */
  const mediaShell =
    "relative aspect-[10/3] w-full shrink-0 overflow-hidden rounded-t-2xl border-b border-[color:var(--gl-card-border)] bg-[var(--gl-card-media-bg)]";

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
            <li key={communityCardListKey(post, i)}>
              <CardInner post={post} cardClass={cardClass} mediaShell={mediaShell} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
