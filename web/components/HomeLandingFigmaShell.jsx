"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HeartIcon from "./HeartIcon";
import HuajaiyCentralTemplate, { IconGamepad, IconShare, IconShop } from "./HuajaiyCentralTemplate";
import { DEFAULT_CENTRAL_GAME_COVER_PATH } from "../lib/centralGameDefaults";
import { formatRelativeTimeTh } from "../lib/publicMemberPosts";
import { publicMemberPostPath } from "../lib/memberPublicUrls";
import { publicCentralGamePlayPath } from "../lib/publicGamePaths";
import { PUBLIC_SHOP_PATH } from "../lib/publicNavPaths";

const PRODUCTS_PLACEHOLDER = [
  { name: "คอนโทรลเลอร์ไร้สาย", price: "3,900", was: "4,500", icon: "🎮" },
  { name: "คีย์บอร์ดเกมมิ่ง", price: "2,490", was: "2,990", icon: "⌨️" },
  { name: "เมาส์ออปติคอล", price: "890", was: "1,190", icon: "🖱️" },
  { name: "หูฟังครอบหู", price: "1,590", was: "2,290", icon: "🎧" }
];

/** เกมแนะนำ: ขนาดการ์ด (รูปสี่เหลี่ยม) + ช่องว่างระหว่างการ์ด — ใช้คำนวณจำนวนการ์ดต่อแถว */
const REC_GAME_CARD_PX = 200;
const REC_GAME_GRID_GAP_PX = 6;
const RED_HEART_SRC = "/hearts/red-heart.png";

/** การ์ดเชิญชวนสร้างเกม — โครงสร้างเดียวกับการ์ดเกมแนะนำ (200×200 + ข้อความ) */
function RecommendedCreateGameCard() {
  return (
    <Link
      href="/account/create-game"
      className="group relative flex w-[200px] max-w-full flex-col overflow-hidden rounded-2xl border border-pink-100/80 bg-white shadow-sm shadow-pink-100/50 outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#FF2E8C]/35 focus-visible:ring-offset-2"
    >
      <div className="relative flex h-[200px] w-[200px] max-w-full shrink-0 items-center justify-center overflow-hidden bg-neutral-100">
        <span className="flex h-[140px] w-[140px] items-center justify-center rounded-2xl bg-white text-[#FF2E8C] shadow-sm ring-1 ring-pink-100/80">
          <IconGamepad className="h-[72px] w-[72px]" aria-hidden />
        </span>
      </div>
      <div className="flex flex-col gap-1 px-2 pb-4 pt-2.5 text-center">
        <span className="line-clamp-3 text-sm font-bold leading-snug text-[#FF2E8C]">คุณกำหนดสร้างเกมเองได้</span>
      </div>
    </Link>
  );
}

function SectionHeader({ id, icon, title, extra, actionHref, actionLabel }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF2E8C] to-[#e91e8c] text-white shadow-md shadow-pink-300/40">
          {icon}
        </span>
        <h2 id={id} className="text-xl font-bold text-neutral-900 sm:text-2xl">
          {title}
        </h2>
        {extra ? <span className="text-sm font-semibold text-[#FF2E8C]">{extra}</span> : null}
      </div>
      {actionHref ? (
        <Link
          href={actionHref}
          className="inline-flex w-fit items-center rounded-full bg-gradient-to-r from-[#FF2E8C] to-[#f472b6] px-5 py-2 text-sm font-bold text-white shadow-md shadow-pink-400/25 transition hover:brightness-105"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

/**
 * หน้าแรก — เทมเพลตกลาง + พื้นหลังขาว + เกม / โพสต์ / สินค้า (การ์ดเดิม)
 * ลิงก์เมนูใช้เส้นทางเดิมของเว็บ · เกมแนะนำดึงจาก API สาธารณะ
 */
export default function HomeLandingFigmaShell({
  onHamburgerClick,
  recommendedGames = [],
  latestMemberPosts = [],
  lineProfileImageUrl,
  profileDisplayName
}) {
  const postsToShow = useMemo(() => {
    const list = Array.isArray(latestMemberPosts) ? latestMemberPosts : [];
    return list.filter((p) => p && String(p.postId || "").trim() && String(p.username || "").trim()).slice(0, 6);
  }, [latestMemberPosts]);

  const shareMemberPost = useCallback((e, post) => {
    e.preventDefault();
    e.stopPropagation();
    const path = publicMemberPostPath(post.username, post.postId);
    const url =
      typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    const title = String(post.title || "").trim() || "โพสต์";
    if (typeof navigator !== "undefined" && navigator.share) {
      void navigator.share({ title, url }).catch(() => {
        void navigator.clipboard?.writeText?.(url).catch(() => {});
      });
    } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(url).catch(() => {});
    }
  }, []);

  const gamesToShow = useMemo(() => {
    const list = Array.isArray(recommendedGames) ? recommendedGames : [];
    return list.filter((g) => g && String(g.id || "").trim()).slice(0, 4);
  }, [recommendedGames]);

  const gamesGridRef = useRef(null);
  const [recGameCols, setRecGameCols] = useState(4);

  useEffect(() => {
    const el = gamesGridRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      const cols = Math.max(
        1,
        Math.floor((w + REC_GAME_GRID_GAP_PX) / (REC_GAME_CARD_PX + REC_GAME_GRID_GAP_PX))
      );
      setRecGameCols(cols);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /**
   * จำนวนการ์ด «สร้างเกม» — ช่องว่างที่เหลือในแถวสุดท้าย (เช่น เหลือ 2 ช่อง = 2 การ์ด)
   * ถ้าเกมครบแถวพอดี ให้การ์ดเชิญชวน 1 ใบในแถวถัดไป
   */
  const recGameCtaCount = useMemo(() => {
    const n = gamesToShow.length;
    if (n === 0) return 1;
    const mod = n % recGameCols;
    if (mod === 0) return 1;
    return recGameCols - mod;
  }, [gamesToShow.length, recGameCols]);

  const shareRecommendedGame = useCallback(async (e, game) => {
    e.preventDefault();
    e.stopPropagation();
    const id = String(game?.id || "").trim();
    if (!id) return;
    const title = String(game?.title || "").trim() || "เกม HUAJAIY";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}${publicCentralGamePlayPath(game)}`;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title, text: "ชวนเล่นเกมนี้บน HUAJAIY", url });
      } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* ยกเลิกแชร์หรือคัดลอกไม่ได้ */
    }
  }, []);

  return (
    <HuajaiyCentralTemplate
      onHamburgerClick={onHamburgerClick}
      lineProfileImageUrl={lineProfileImageUrl}
      profileDisplayName={profileDisplayName}
      activeNavKey="home"
    >
      {/* Hero — พื้นขาว · ข้อความเดิม */}
      <section className="relative overflow-hidden bg-white" aria-labelledby="home-landing-hero-title">
        <div className="relative mx-auto max-w-[1200px] px-3 pb-[4.5rem] pt-[3.75rem] sm:px-5 sm:pb-24 sm:pt-[5.25rem]">
          <div className="mx-auto max-w-3xl text-center">
            <h1
              id="home-landing-hero-title"
              className="text-3xl font-bold leading-tight text-[#E60012] sm:text-4xl md:text-5xl"
            >
              ยินดีต้อนรับ สู่แพลตฟอร์มหัวใจ
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base font-semibold leading-relaxed text-neutral-700 sm:text-lg">
              เล่นเกม สะสมหัวใจ ช้อปในร้านค้า และติดตามโพสต์ชุมชน — ครบในที่เดียว
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:mt-12 sm:gap-4">
              <Link
                href="/game"
                className="inline-flex min-h-[3rem] min-w-[10rem] items-center justify-center rounded-full bg-gradient-to-r from-[#FF2E8C] to-[#f472b6] px-6 py-3 text-base font-bold text-white shadow-md shadow-pink-400/30 transition hover:brightness-105"
              >
                เกมและรางวัล
              </Link>
              <Link
                href="/login/line"
                className="inline-flex min-h-[3rem] min-w-[10rem] items-center justify-center gap-2 rounded-full border-2 border-[#06C755]/50 bg-[#06C755] px-6 py-3 text-base font-bold text-white shadow-md transition hover:bg-[#05b34c]"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden>
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.137h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.084.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                สมัครผ่าน LINE
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* เนื้อหาหลัก — พื้นขาว */}
      <div className="bg-white">
        <div className="mx-auto max-w-[1200px] space-y-12 px-3 py-10 sm:space-y-14 sm:px-5 sm:py-12">
          {/* เกมแนะนำ */}
          <section aria-labelledby="home-sec-games">
            <SectionHeader
              id="home-sec-games"
              icon={<IconGamepad className="h-5 w-5" />}
              title="เกมแนะนำ"
              actionHref="/game"
              actionLabel="ดูทั้งหมด"
            />
            <div
              ref={gamesGridRef}
              className="grid justify-center gap-1.5"
              style={{
                gridTemplateColumns: `repeat(${recGameCols}, ${REC_GAME_CARD_PX}px)`
              }}
            >
              {gamesToShow.length === 0 ? (
                <>
                  <p
                    className="rounded-2xl border border-dashed border-pink-200 bg-white/80 py-10 text-center text-sm text-neutral-600"
                    style={{ gridColumn: "1 / -1" }}
                  >
                    ยังไม่มีเกมที่เปิดแสดง —{" "}
                    <Link href="/game" className="font-semibold text-[#FF2E8C] underline-offset-2 hover:underline">
                      ไปหน้าเกมทั้งหมด
                    </Link>
                  </p>
                  <RecommendedCreateGameCard />
                </>
              ) : (
                <>
                  {gamesToShow.map((g) => {
                    const id = String(g.id || "").trim();
                    const cover = String(g.gameCoverUrl || "").trim();
                    const creator = String(g.creatorUsername || "").trim().toLowerCase();
                    const title = String(g.title || "").trim() || "เกม";
                    const plays = Math.max(0, Math.floor(Number(g.playCount) || 0));
                    return (
                      <div
                        key={id}
                        className="group relative flex w-[200px] max-w-full flex-col overflow-hidden rounded-2xl border border-pink-100/80 bg-white shadow-sm shadow-pink-100/50 transition-shadow hover:shadow-md"
                      >
                        <Link
                          href={publicCentralGamePlayPath(g)}
                          className="flex min-h-0 flex-col outline-none focus-visible:ring-2 focus-visible:ring-[#FF2E8C]/35 focus-visible:ring-offset-2"
                        >
                          {/* พื้นที่ใส่ภาพ 200×200 px ชิดขอบการ์ด */}
                          <div className="relative h-[200px] w-[200px] max-w-full shrink-0 overflow-hidden bg-neutral-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={cover || DEFAULT_CENTRAL_GAME_COVER_PATH}
                              alt=""
                              width={200}
                              height={200}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex flex-col gap-1 px-2 pb-2 pt-2.5">
                            <h3 className="line-clamp-2 text-base font-bold leading-snug text-[#FF2E8C]">{title}</h3>
                            <p className="text-sm text-neutral-500">
                              {plays.toLocaleString("th-TH")} รอบ
                            </p>
                            <p className="text-xs font-medium text-red-600">
                              {creator ? `@${creator}` : "@—"}
                            </p>
                          </div>
                        </Link>
                        <div className="flex items-center gap-1 px-2 pb-2">
                          <Link
                            href={publicCentralGamePlayPath(g)}
                            className="flex min-h-[2.25rem] min-w-0 flex-1 items-center justify-center gap-0.5 rounded-full bg-gradient-to-r from-[#FF2E8C] to-[#f472b6] px-1.5 py-1.5 text-[10px] font-bold leading-none text-white shadow-md shadow-pink-400/30 transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2E8C]/45 focus-visible:ring-offset-2 sm:gap-1 sm:px-2 sm:text-xs"
                            aria-label={`เล่นเลย ${title}`}
                          >
                            <IconGamepad className="h-3.5 w-3.5 shrink-0 text-white sm:h-4 sm:w-4" aria-hidden />
                            เล่นเลย
                          </Link>
                          <button
                            type="button"
                            className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-pink-100 bg-white px-1.5 py-1.5 text-[10px] font-semibold leading-none text-[#FF2E8C] shadow-sm transition hover:bg-pink-50 sm:px-2 sm:text-xs"
                            aria-label={`แชร์ ${title}`}
                            onClick={(e) => shareRecommendedGame(e, g)}
                          >
                            <IconShare className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                            แชร์
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {Array.from({ length: recGameCtaCount }, (_, i) => (
                    <RecommendedCreateGameCard key={`rec-cta-${i}`} />
                  ))}
                </>
              )}
            </div>
          </section>

          {/* โพสต์ล่าสุด */}
          <section aria-labelledby="home-sec-posts">
            <SectionHeader
              id="home-sec-posts"
              icon={
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
                </svg>
              }
              title="โพสต์ล่าสุด"
              actionHref="/posts"
              actionLabel="ดูทั้งหมด"
            />
            {postsToShow.length === 0 ? (
              <p className="rounded-2xl border border-pink-100/80 bg-white px-4 py-10 text-center text-sm leading-relaxed text-neutral-600 shadow-sm">
                ยังไม่มีโพสต์จากสมาชิกในขณะนี้ ·{" "}
                <Link href="/posts" className="font-semibold text-[#FF2E8C] underline underline-offset-2 hover:text-[#d9267a]">
                  ดูโซนโพสต์
                </Link>
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {postsToShow.map((post) => {
                  const displayName = String(post.pageDisplayName || post.username || "").trim() || post.username;
                  const initial = (displayName || "?").slice(0, 1).toUpperCase();
                  const href = publicMemberPostPath(post.username, post.postId);
                  const timeLabel = formatRelativeTimeTh(post.createdAt);
                  const title = String(post.title || "").trim() || "โพสต์";
                  const excerpt = String(post.excerpt || "").trim();
                  const cover = post.coverImageUrl && String(post.coverImageUrl).trim() !== "" ? String(post.coverImageUrl).trim() : null;
                  const sr = post.shareReward;
                  const perHeart =
                    sr &&
                    sr.status === "active" &&
                    sr.redPerMember != null &&
                    Number(sr.redPerMember) > 0
                      ? Math.floor(Number(sr.redPerMember))
                      : 0;
                  const maxPeople =
                    sr && sr.maxRecipientSlots != null && Number(sr.maxRecipientSlots) > 0
                      ? Math.floor(Number(sr.maxRecipientSlots))
                      : 0;
                  const showShareRewardTeaser = perHeart > 0 && maxPeople > 0;
                  return (
                    <article
                      key={`${post.username}-${post.postId}`}
                      className="flex flex-col overflow-hidden rounded-2xl border border-pink-100/80 bg-white shadow-sm shadow-pink-100/50"
                    >
                      <Link href={href} className="flex min-h-0 flex-1 flex-col outline-none transition hover:bg-pink-50/40 focus-visible:ring-2 focus-visible:ring-[#FF2E8C]/35 focus-visible:ring-offset-2">
                        <div className="flex items-center gap-3 border-b border-pink-50 p-4">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF2E8C] to-purple-500 text-sm font-bold text-white"
                            aria-hidden
                          >
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-neutral-900">{displayName}</p>
                            <p className="text-xs text-neutral-500">{timeLabel || "—"}</p>
                          </div>
                        </div>
                        <div className="grow px-4 py-3">
                          <h3 className="line-clamp-2 text-base font-bold leading-snug text-neutral-900">{title}</h3>
                          {excerpt ? (
                            <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-neutral-700">{excerpt}</p>
                          ) : null}
                        </div>
                        {cover ? (
                          <div className="mx-4 mb-4 h-36 overflow-hidden rounded-xl bg-neutral-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                          </div>
                        ) : (
                          <div className="mx-4 mb-4 h-36 rounded-xl bg-gradient-to-br from-pink-100/80 to-violet-100/80" aria-hidden />
                        )}
                      </Link>
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
                          className="inline-flex max-w-[min(100%,11rem)] flex-col items-end gap-0.5 font-semibold text-[#FF2E8C] hover:underline sm:max-w-none sm:flex-row sm:items-center sm:gap-1"
                          onClick={(e) => shareMemberPost(e, post)}
                        >
                          <span className="inline-flex items-center gap-1 whitespace-nowrap">
                            <IconShare className="h-4 w-4 shrink-0 text-[#FF2E8C]" />
                            แชร์
                          </span>
                          {showShareRewardTeaser ? (
                            <span className="inline-flex flex-wrap items-center justify-end gap-0.5 text-[10px] font-bold leading-tight text-[#FF2E8C] sm:text-[11px]">
                              <span>
                                ได้{perHeart}
                              </span>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={RED_HEART_SRC}
                                alt=""
                                className="inline h-3 w-3 shrink-0 align-middle opacity-95"
                                width={12}
                                height={12}
                              />
                              <span>
                                /{maxPeople}คนแรก
                              </span>
                            </span>
                          ) : null}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* สินค้า */}
          <section aria-labelledby="home-sec-products">
            <SectionHeader
              id="home-sec-products"
              icon={<IconShop className="h-5 w-5" />}
              title="สินค้า"
              extra="ลดสูงสุด 40%"
              actionHref={PUBLIC_SHOP_PATH}
              actionLabel="ดูทั้งหมด"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PRODUCTS_PLACEHOLDER.map((p) => (
                <div
                  key={p.name}
                  className="relative flex flex-col rounded-2xl border border-pink-100/80 bg-white shadow-sm shadow-pink-100/50 transition-transform transition-shadow duration-200 ease-out will-change-transform hover:scale-[1.04] hover:shadow-md"
                >
                  <span className="absolute right-3 top-3 z-[1] rounded-full bg-gradient-to-r from-[#FF2E8C] to-[#f472b6] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    HOT
                  </span>
                  <div className="flex h-40 items-center justify-center overflow-hidden rounded-t-2xl bg-gradient-to-br from-slate-50 to-pink-50/80 text-5xl">
                    {p.icon}
                  </div>
                  <div className="flex flex-1 flex-col rounded-b-2xl p-4">
                    <h3 className="font-bold text-neutral-900">{p.name}</h3>
                    <p className="mt-2 text-lg font-bold text-[#FF2E8C]">฿{p.price}</p>
                    <p className="text-sm font-medium text-[#E60012] line-through decoration-neutral-700 decoration-2">
                      ฿{p.was}
                    </p>
                    <Link
                      href={PUBLIC_SHOP_PATH}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#FF2E8C] to-[#f472b6] py-2.5 text-sm font-bold text-white shadow-md shadow-pink-400/20 transition hover:brightness-105"
                    >
                      ซื้อเลยตอนนี้
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </HuajaiyCentralTemplate>
  );
}
