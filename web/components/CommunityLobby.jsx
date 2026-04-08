"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { IconShare } from "./HuajaiyCentralTemplate";
import HeartIcon from "./HeartIcon";

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

/**
 * การ์ดโพสต์แนวฟีด — โครงเดียวกับหน้าแรก (หัวผู้โพสต์ → หัวข้อ → คำอธิบาย → รูป → แถบไลก์/แชร์)
 */
function FeedCard({ post, onShare }) {
  const phref = post?.href;
  const hasNav = isNavigableHref(phref);
  const isMemberPage = String(post?.category || "").trim() === "เพจสมาชิก";

  const headerName = isMemberPage
    ? String(post?.title || "").trim() || "เพจสมาชิก"
    : String(post?.category || "").trim() || "โพสต์ชุมชน";
  const secondaryMeta = String(post?.dateLine || "").trim() || "—";
  const headline = isMemberPage ? "" : String(post?.title || "").trim();
  const excerpt = clipDescription(post?.excerpt);
  const avatarUrl = String(post?.avatarUrl || "").trim();
  const initial = (headerName || "?").slice(0, 1).toUpperCase();

  const rawSrc = resolveCommunityImageSrc(post?.imageUrl);
  const showImg = Boolean(rawSrc);

  const cardBody = (
    <>
      <div className="flex items-center gap-3 border-b border-pink-50 p-4">
        {avatarUrl && /^https:\/\//i.test(avatarUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-pink-100/80"
            width={40}
            height={40}
          />
        ) : (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF2E8C] to-purple-500 text-sm font-bold text-white"
            aria-hidden
          >
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-bold text-neutral-900">{headerName}</p>
          <p className="text-xs text-neutral-500">{secondaryMeta}</p>
        </div>
      </div>
      <div className="grow px-4 py-3">
        {headline ? (
          <h2 className="line-clamp-2 text-base font-bold leading-snug text-neutral-900">{headline}</h2>
        ) : null}
        {excerpt ? (
          <p
            className={`line-clamp-3 text-sm leading-relaxed text-neutral-700 ${headline ? "mt-1.5" : ""}`}
          >
            {excerpt}
          </p>
        ) : null}
      </div>
      {showImg ? (
        <div className="mx-4 mb-4 h-36 overflow-hidden rounded-xl bg-neutral-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={rawSrc}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : (
        <div className="mx-4 mb-4 h-36 rounded-xl bg-gradient-to-br from-pink-100/80 to-violet-100/80" aria-hidden />
      )}
    </>
  );

  const linkClassName =
    "flex min-h-0 flex-1 flex-col outline-none transition hover:bg-pink-50/40 focus-visible:ring-2 focus-visible:ring-[#FF2E8C]/35 focus-visible:ring-offset-2";

  const mainLink =
    hasNav && /^https:\/\//i.test(String(phref)) ? (
      <a href={phref} className={linkClassName} target="_blank" rel="noopener noreferrer">
        {cardBody}
      </a>
    ) : hasNav ? (
      <Link href={phref} className={linkClassName}>
        {cardBody}
      </Link>
    ) : (
      <div className={linkClassName}>{cardBody}</div>
    );

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-pink-100/80 bg-white shadow-sm shadow-pink-100/50">
      {mainLink}
      <div className="flex items-center justify-between border-t border-pink-50 px-4 py-3 text-sm text-neutral-600">
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <HeartIcon className="h-4 w-4 text-[#FF2E8C]" />
            0
          </span>
          <span className="inline-flex items-center gap-1 text-neutral-500" aria-hidden>
            💬 0
          </span>
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-1 font-semibold text-[#FF2E8C] hover:underline"
          onClick={(e) => onShare(e, phref, headline || headerName)}
        >
          <IconShare className="h-4 w-4 shrink-0 text-[#FF2E8C]" />
          แชร์
        </button>
      </div>
    </article>
  );
}

/**
 * ล็อบบี้เพจชุมชน — การ์ดโพสต์แนวฟีด (ค้นหา + กริด)
 * @param {{ posts: Array<object> }} props
 */
export default function CommunityLobby({ posts = [] }) {
  const [q, setQ] = useState("");

  const sharePost = useCallback((e, href, label) => {
    e.preventDefault();
    e.stopPropagation();
    const h = String(href || "").trim();
    if (!h || h === "#") return;
    const url = /^https:\/\//i.test(h)
      ? h
      : `${typeof window !== "undefined" ? window.location.origin : ""}${h.startsWith("/") ? h : `/${h}`}`;
    const t = String(label || "").trim() || "HUAJAIY";
    if (typeof navigator !== "undefined" && navigator.share) {
      void navigator.share({ title: t, url }).catch(() => {
        void navigator.clipboard?.writeText?.(url).catch(() => {});
      });
    } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(url).catch(() => {});
    }
  }, []);

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
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
          {filtered.map((post, i) => (
            <li key={communityCardListKey(post, i)}>
              <FeedCard post={post} onShare={sharePost} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
