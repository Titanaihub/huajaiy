"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import HuajaiyCentralTemplate, { IconSearch } from "./HuajaiyCentralTemplate";
import { useMemberAuth } from "./MemberAuthProvider";
import { publicMemberPath, publicMemberPostPath } from "../lib/memberPublicUrls";

const GAME_CODE_RE = /^[0-9]{10,32}$/;

function gameHref(g) {
  const code = g.gameCode && String(g.gameCode).trim();
  if (code && GAME_CODE_RE.test(code)) return `/game/${encodeURIComponent(code)}`;
  return `/game/${encodeURIComponent(g.id)}`;
}

function clip(s, n) {
  const t = String(s ?? "").trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

function formatThb(n) {
  const x = Math.floor(Number(n) || 0);
  try {
    return x.toLocaleString("th-TH");
  } catch {
    return String(x);
  }
}

/**
 * หน้าค้นหารวม — `/search?q=`
 */
export default function SiteSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get("q") || "";
  const [input, setInput] = useState(qFromUrl);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const { user: memberUser } = useMemberAuth();
  const displayName =
    memberUser && [memberUser.firstName, memberUser.lastName].filter(Boolean).join(" ").trim()
      ? [memberUser.firstName, memberUser.lastName].filter(Boolean).join(" ").trim()
      : memberUser
        ? "สมาชิก"
        : undefined;

  useEffect(() => {
    setInput(qFromUrl);
  }, [qFromUrl]);

  useEffect(() => {
    const q = qFromUrl.trim();
    if (!q) {
      setData({
        ok: true,
        q: "",
        games: [],
        memberPages: [],
        posts: [],
        products: []
      });
      setErr("");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr("");
    fetch(`/api/public/site-search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (!j || j.ok === false) {
          setErr(String(j?.error || "ค้นหาไม่สำเร็จ"));
          setData(null);
          return;
        }
        setData(j);
      })
      .catch(() => {
        if (!cancelled) {
          setErr("เชื่อมต่อไม่สำเร็จ");
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [qFromUrl]);

  function onSubmit(e) {
    e.preventDefault();
    const t = input.trim();
    if (!t) {
      router.push("/search");
      return;
    }
    router.push(`/search?q=${encodeURIComponent(t)}`);
  }

  const games = data?.games || [];
  const memberPages = data?.memberPages || [];
  const posts = data?.posts || [];
  const products = data?.products || [];
  const hasAny =
    games.length + memberPages.length + posts.length + products.length > 0;

  return (
    <HuajaiyCentralTemplate
      onHamburgerClick={() => router.push("/member")}
      lineProfileImageUrl={memberUser?.linePictureUrl || undefined}
      profileDisplayName={displayName}
      pinkBarMenuLabel="ค้นหา"
      activeNavKey={null}
      mainClassName="flex min-w-0 flex-1 flex-col bg-[#f4f4f6]"
    >
      <section className="border-b border-pink-100/80 bg-white">
        <div className="mx-auto max-w-[1200px] px-3 py-6 sm:px-5 sm:py-8">
          <h1 className="font-heading text-2xl font-bold text-neutral-900 sm:text-3xl">
            ค้นหา
          </h1>
          <p className="mt-1 text-sm text-neutral-600 sm:text-base">
            เกม เพจสมาชิก โพสต์ และสินค้าในร้าน
          </p>
          <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex min-w-0 flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                <IconSearch className="h-5 w-5" />
              </span>
              <input
                type="search"
                name="q"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="พิมพ์คำค้น…"
                className="w-full rounded-xl border border-pink-100 bg-white py-2.5 pl-10 pr-3 text-sm text-neutral-900 shadow-sm outline-none ring-pink-200 placeholder:text-neutral-400 focus:border-pink-300 focus:ring-2 sm:text-base"
                autoComplete="off"
                enterKeyHint="search"
              />
            </div>
            <button
              type="submit"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF2E8C] to-[#f472b6] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-pink-400/25 transition hover:brightness-105 sm:py-3"
            >
              ค้นหา
            </button>
          </form>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1200px] flex-1 px-3 py-6 sm:px-5 sm:py-8">
        {!qFromUrl.trim() ? (
          <p className="text-center text-sm text-neutral-500">
            พิมพ์คำค้นแล้วกด «ค้นหา» หรือ Enter
          </p>
        ) : loading ? (
          <p className="text-center text-sm text-neutral-500">กำลังค้นหา…</p>
        ) : err ? (
          <p className="text-center text-sm text-red-600">{err}</p>
        ) : !hasAny ? (
          <p className="text-center text-sm text-neutral-600">
            ไม่พบผลสำหรับ «{clip(qFromUrl, 80)}»
          </p>
        ) : (
          <div className="space-y-10">
            {games.length > 0 ? (
              <section aria-labelledby="search-games">
                <h2
                  id="search-games"
                  className="mb-3 border-b border-pink-100 pb-2 text-lg font-bold text-neutral-900"
                >
                  เกม
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {games.map((g) => (
                    <li key={g.id}>
                      <Link
                        href={gameHref(g)}
                        className="flex gap-3 rounded-xl border border-pink-100/90 bg-white p-3 shadow-sm transition hover:border-pink-200 hover:shadow-md"
                      >
                        {g.gameCoverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={g.gameCoverUrl}
                            alt=""
                            className="h-16 w-16 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-pink-50 text-2xl">
                            🎮
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-neutral-900">{clip(g.title, 120)}</p>
                          {g.creatorUsername ? (
                            <p className="mt-0.5 text-xs text-neutral-500">
                              โดย @{g.creatorUsername}
                            </p>
                          ) : null}
                          {g.description ? (
                            <p className="mt-1 line-clamp-2 text-xs text-neutral-600">
                              {clip(g.description, 160)}
                            </p>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {memberPages.length > 0 ? (
              <section aria-labelledby="search-pages">
                <h2
                  id="search-pages"
                  className="mb-3 border-b border-pink-100 pb-2 text-lg font-bold text-neutral-900"
                >
                  เพจสมาชิก
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {memberPages.map((m) => (
                    <li key={m.username}>
                      <Link
                        href={publicMemberPath(m.username)}
                        className="flex gap-3 rounded-xl border border-pink-100/90 bg-white p-3 shadow-sm transition hover:border-pink-200 hover:shadow-md"
                      >
                        {m.profilePictureUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.profilePictureUrl}
                            alt=""
                            className="h-16 w-16 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-pink-50 text-2xl">
                            👤
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-neutral-900">
                            {clip(m.pageTitle || m.displayName, 80)}
                          </p>
                          <p className="mt-0.5 text-xs text-neutral-500">@{m.username}</p>
                          {m.publicPageBio ? (
                            <p className="mt-1 line-clamp-2 text-xs text-neutral-600">
                              {clip(m.publicPageBio, 140)}
                            </p>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {posts.length > 0 ? (
              <section aria-labelledby="search-posts">
                <h2
                  id="search-posts"
                  className="mb-3 border-b border-pink-100 pb-2 text-lg font-bold text-neutral-900"
                >
                  โพสต์
                </h2>
                <ul className="space-y-2">
                  {posts.map((p) => (
                    <li key={`${p.username}-${p.postId}`}>
                      <Link
                        href={publicMemberPostPath(p.username, p.postId)}
                        className="block rounded-xl border border-pink-100/90 bg-white p-3 shadow-sm transition hover:border-pink-200 hover:shadow-md"
                      >
                        <p className="font-semibold text-neutral-900">{clip(p.title, 160)}</p>
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {p.pageDisplayName} · @{p.username}
                        </p>
                        {p.excerpt ? (
                          <p className="mt-1 line-clamp-2 text-sm text-neutral-600">
                            {clip(p.excerpt, 220)}
                          </p>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {products.length > 0 ? (
              <section aria-labelledby="search-products">
                <h2
                  id="search-products"
                  className="mb-3 border-b border-pink-100 pb-2 text-lg font-bold text-neutral-900"
                >
                  สินค้า
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/shop/${p.id}`}
                        className="flex flex-col overflow-hidden rounded-xl border border-pink-100/90 bg-white shadow-sm transition hover:border-pink-200 hover:shadow-md"
                      >
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.imageUrl}
                            alt=""
                            className="aspect-[4/3] w-full object-cover"
                          />
                        ) : (
                          <div className="flex aspect-[4/3] w-full items-center justify-center bg-slate-100 text-4xl">
                            🛒
                          </div>
                        )}
                        <div className="p-3">
                          <p className="font-semibold text-neutral-900">{clip(p.title, 100)}</p>
                          {p.shopName ? (
                            <p className="mt-0.5 text-xs text-neutral-500">{p.shopName}</p>
                          ) : null}
                          <p className="mt-2 text-lg font-bold text-[#FF2E8C]">
                            ฿{formatThb(p.priceThb)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </HuajaiyCentralTemplate>
  );
}
