"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CommunityLobby from "./CommunityLobby";
import HuajaiyCentralTemplate, { IconGamepad, IconShare, IconShop } from "./HuajaiyCentralTemplate";
import { DEFAULT_CENTRAL_GAME_COVER_PATH } from "../lib/centralGameDefaults";
import { PUBLIC_SHOP_PATH } from "../lib/publicNavPaths";

/** เกมแนะนำ — ขนาดการ์ด + gap (คำนวณจำนวนคอลัมน์) */
const REC_GAME_CARD_PX = 200;
const REC_GAME_GRID_GAP_PX = 6;

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
        <div className="flex min-w-0 flex-wrap items-baseline gap-2 sm:gap-3">
          <h2 id={id} className="text-xl font-bold text-neutral-900 sm:text-2xl">
            {title}
          </h2>
          {extra ? (
            <span className="text-sm font-semibold text-[#FF2E8C]">{extra}</span>
          ) : null}
        </div>
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
 * หน้าแรก — โครง HuajaiyCentralTemplate + พื้นหลังเดียวกับ /central-template · เกมแนะนำจาก API
 */
function PostFeedIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
    </svg>
  );
}

export default function HomeLandingFigmaShell({
  onHamburgerClick,
  recommendedGames = [],
  communityPosts = [],
  featuredProducts = [],
  featuredHeading = null,
  communityLobbyStyle,
  lineProfileImageUrl,
  profileDisplayName
}) {
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
    const url = `${origin}/game/${encodeURIComponent(id)}`;
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

  const productsTitle =
    String(featuredHeading?.title ?? "")
      .trim()
      .replace(/^Featured products$/i, "สินค้าแนะนำ") || "สินค้าแนะนำ";
  const productsExtra = String(featuredHeading?.subtitle ?? "").trim();

  const productsToShow = useMemo(() => {
    const list = Array.isArray(featuredProducts) ? featuredProducts : [];
    return list.filter((p) => p && String(p.id || "").trim()).slice(0, 8);
  }, [featuredProducts]);

  return (
    <HuajaiyCentralTemplate
      onHamburgerClick={onHamburgerClick}
      lineProfileImageUrl={lineProfileImageUrl}
      profileDisplayName={profileDisplayName}
      activeNavKey="home"
      mainClassName="flex min-h-0 min-w-0 flex-1 flex-col bg-[#fce7f3]/45"
    >
      <section className="border-b border-pink-100/50 px-3 py-10 sm:px-5 sm:py-12" aria-labelledby="home-landing-hero-title">
        <div className="mx-auto max-w-3xl text-center">
          <h1 id="home-landing-hero-title" className="text-3xl font-bold leading-tight text-neutral-900 sm:text-4xl md:text-5xl">
            ยินดีต้อนรับ สู่แพลตฟอร์มหัวใจ
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base font-semibold leading-relaxed text-neutral-700 sm:text-lg">
            เล่นเกม สะสมหัวใจ ช้อปในร้านค้า และติดตามโพสต์ชุมชน — ครบในที่เดียว
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:mt-12 sm:gap-4">
            <Link
              href="/game"
              className="inline-flex min-h-[3rem] min-w-[10rem] items-center justify-center rounded-full bg-gradient-to-r from-[#FF2E8C] to-[#f472b6] px-6 py-3 text-base font-bold text-white shadow-lg shadow-pink-400/25 transition hover:brightness-105"
            >
              เกมและรางวัล
            </Link>
            <Link
              href="/login/line"
              className="inline-flex min-h-[3rem] min-w-[10rem] items-center justify-center gap-2 rounded-full border-2 border-[#06C755]/30 bg-[#06C755] px-6 py-3 text-base font-bold text-white shadow-md transition hover:bg-[#05b34c]"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden>
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.137h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.084.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              สมัครผ่าน LINE
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1200px] space-y-14 px-3 py-10 sm:px-5 sm:py-12">
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
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${recGameCols}, ${REC_GAME_CARD_PX}px)`,
              justifyContent: "start"
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
                        href={`/game/${encodeURIComponent(id)}`}
                        className="flex min-h-0 flex-col outline-none focus-visible:ring-2 focus-visible:ring-[#FF2E8C]/35 focus-visible:ring-offset-2"
                      >
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
                        <div className="flex flex-col gap-1 px-2 pb-11 pt-2.5">
                          <h3 className="line-clamp-2 text-base font-bold leading-snug text-[#FF2E8C]">{title}</h3>
                          <p className="text-sm text-neutral-500">{plays.toLocaleString("th-TH")} รอบ</p>
                          <p className="text-xs font-medium text-red-600">{creator ? `@${creator}` : "@—"}</p>
                        </div>
                      </Link>
                      <button
                        type="button"
                        className="absolute bottom-2.5 right-2.5 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-pink-100 bg-white text-[#FF2E8C] shadow-sm transition hover:bg-pink-50"
                        aria-label={`แชร์ ${title}`}
                        onClick={(e) => shareRecommendedGame(e, g)}
                      >
                        <IconShare className="h-4 w-4 shrink-0" />
                      </button>
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

        <section aria-labelledby="home-sec-posts" style={communityLobbyStyle}>
          <SectionHeader
            id="home-sec-posts"
            icon={<PostFeedIcon className="h-5 w-5 text-white" />}
            title="โพสต์ล่าสุด"
            actionHref="/page"
            actionLabel="ดูทั้งหมด"
          />
          {communityPosts.length === 0 ? (
            <div className="rounded-2xl border border-pink-100/80 bg-white/90 p-8 text-center text-sm text-neutral-600 shadow-sm">
              <p className="font-medium text-neutral-800">ยังไม่มีโพสต์ที่แสดงบนหน้าแรก</p>
              <p className="mt-2">
                <Link href="/page" className="font-semibold text-[#FF2E8C] underline-offset-2 hover:underline">
                  ไปเพจชุมชน
                </Link>
              </p>
            </div>
          ) : (
            <CommunityLobby posts={communityPosts} />
          )}
        </section>

        <section aria-labelledby="home-sec-products">
          <SectionHeader
            id="home-sec-products"
            icon={<IconShop className="h-5 w-5" />}
            title={productsTitle}
            extra={productsExtra || undefined}
            actionHref={PUBLIC_SHOP_PATH}
            actionLabel="ดูทั้งหมด"
          />
          {productsToShow.length === 0 ? (
            <div className="rounded-2xl border border-pink-100/80 bg-white/90 p-8 text-center text-sm text-neutral-600 shadow-sm">
              <p className="font-medium text-neutral-800">ยังไม่มีสินค้าในตลาด</p>
              <p className="mt-2">
                <Link href={PUBLIC_SHOP_PATH} className="font-semibold text-[#FF2E8C] underline-offset-2 hover:underline">
                  ไปร้านค้า
                </Link>
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {productsToShow.map((p) => {
                const id = String(p.id || "").trim();
                const img = String(p.imageUrl || "").trim();
                const name = String(p.title || "").trim() || "สินค้า";
                const price = Math.max(0, Math.floor(Number(p.priceThb) || 0));
                return (
                  <Link
                    key={id}
                    href={`/shop/${encodeURIComponent(id)}`}
                    className="relative flex flex-col overflow-hidden rounded-2xl border border-pink-100/80 bg-white shadow-sm shadow-pink-100/50 transition-transform transition-shadow duration-200 hover:scale-[1.02] hover:shadow-md"
                  >
                    <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 to-pink-50/80">
                      {img ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={img} alt="" className="h-full w-full object-cover" width={320} height={160} />
                      ) : (
                        <span className="text-5xl" aria-hidden>
                          🛒
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="line-clamp-2 text-base font-bold text-neutral-900">{name}</h3>
                      {p.shopName ? (
                        <p className="mt-1 text-xs text-neutral-500">{String(p.shopName)}</p>
                      ) : null}
                      <p className="mt-2 text-lg font-bold text-[#FF2E8C]">
                        ฿{price.toLocaleString("th-TH")}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </HuajaiyCentralTemplate>
  );
}
