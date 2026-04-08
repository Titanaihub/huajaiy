"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HeartIcon from "./HeartIcon";
import HuajaiyCentralTemplate, { IconGamepad, IconShare, IconShop } from "./HuajaiyCentralTemplate";
import { DEFAULT_CENTRAL_GAME_COVER_PATH } from "../lib/centralGameDefaults";
import { PUBLIC_SHOP_PATH } from "../lib/publicNavPaths";

const PRODUCTS_PLACEHOLDER = [
  { name: "คอนโทรลเลอร์ไร้สาย", price: "3,900", was: "4,500", icon: "🎮" },
  { name: "คีย์บอร์ดเกมมิ่ง", price: "2,490", was: "2,990", icon: "⌨️" },
  { name: "เมาส์ออปติคอล", price: "890", was: "1,190", icon: "🖱️" },
  { name: "หูฟังครอบหู", price: "1,590", was: "2,290", icon: "🎧" }
];

const POSTS_PLACEHOLDER = [
  {
    user: "NightOwl",
    time: "2 ชม. ที่แล้ว",
    excerpt: "วันนี้เล่นเกมสะสมหัวใจครบเควสแล้ว แชร์ประสบการณ์เล็กน้อยให้เพื่อนๆ ที่กำลังเริ่มต้น",
    likes: 128,
    comments: 24
  },
  {
    user: "HeartPlayer",
    time: "5 ชม. ที่แล้ว",
    excerpt: "ของรางวัลในร้านค้ามีตัวเลือกน่าสนใจมาก ใครมีเทคนิคแลกของแนะนำหน่อย",
    likes: 56,
    comments: 12
  },
  {
    user: "ShopFan",
    time: "เมื่อวาน",
    excerpt: "โปรลดราคาช่วงนี้คุ้มมาก กดสั่งแล้วรอของอยู่ แพ็กเกจมาถึงไวดี",
    likes: 203,
    comments: 41
  }
];

/** เกมแนะนำ: ขนาดการ์ด (รูปสี่เหลี่ยม) + ช่องว่างระหว่างการ์ด — ใช้คำนวณจำนวนการ์ดต่อแถว */
const REC_GAME_CARD_PX = 200;
const REC_GAME_GRID_GAP_PX = 6;

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
 * หน้าแรก — เทมเพลตกลาง + hero ไล่สี + เกม / โพสต์ / สินค้า (การ์ดเดิม) · พื้นหลังโซนเนื้อหา = /central-template
 * ลิงก์เมนูใช้เส้นทางเดิมของเว็บ · เกมแนะนำดึงจาก API สาธารณะ
 */
export default function HomeLandingFigmaShell({
  onHamburgerClick,
  recommendedGames = [],
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

  /** พื้นหลัง hero — เฉพาะหัวใจ / กล่องของขวัญ / ดาว (กระพริบด้วย animate-huajaiy-hero-blink) */
  const floatDecor = [
    { t: "12%", l: "6%", s: 15, d: "0s", dur: 2.2, el: "💗" },
    { t: "22%", l: "18%", s: 13, d: "0.4s", dur: 2.8, el: "⭐" },
    { t: "8%", l: "38%", s: 17, d: "0.2s", dur: 2.4, el: "🎁" },
    { t: "32%", l: "52%", s: 14, d: "0.9s", dur: 3, el: "💖" },
    { t: "18%", l: "72%", s: 16, d: "0.1s", dur: 2.6, el: "⭐" },
    { t: "58%", l: "8%", s: 14, d: "0.6s", dur: 2.3, el: "🎁" },
    { t: "48%", l: "28%", s: 12, d: "1.1s", dur: 2.7, el: "💗" },
    { t: "42%", l: "88%", s: 15, d: "0.3s", dur: 2.5, el: "⭐" },
    { t: "68%", l: "42%", s: 13, d: "0.7s", dur: 2.9, el: "🎁" },
    { t: "72%", l: "62%", s: 14, d: "0.5s", dur: 2.2, el: "💗" },
    { t: "28%", l: "92%", s: 12, d: "1.2s", dur: 2.8, el: "⭐" },
    { t: "5%", l: "58%", s: 11, d: "0.8s", dur: 3.1, el: "🎁" },
    { t: "78%", l: "78%", s: 16, d: "0.15s", dur: 2.4, el: "💖" },
    { t: "52%", l: "95%", s: 13, d: "1s", dur: 2.6, el: "💗" }
  ];

  return (
    <HuajaiyCentralTemplate
      onHamburgerClick={onHamburgerClick}
      lineProfileImageUrl={lineProfileImageUrl}
      profileDisplayName={profileDisplayName}
      activeNavKey="home"
    >
      {/* Hero — ไล่เฉดชมพูเข้ม→อ่อน (โทนปุ่มเข้าสู่ระบบ) + เคลื่อนไหว + ไอคอนกระพริบ */}
      <section
        className="relative overflow-hidden bg-[length:400%_100%] bg-no-repeat animate-huajaiy-hero-gradient-shift"
        style={{
          backgroundImage:
            "linear-gradient(90deg, #ec4899, #f43f8c, #FF2E8C, #f472b6, #fb93c9, #fda4d4, #fce7f3, #fda4d4, #fb93c9, #f472b6, #FF2E8C, #ec4899)"
        }}
        aria-labelledby="home-landing-hero-title"
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {floatDecor.map((d, i) => (
            <span
              key={i}
              className="absolute animate-huajaiy-hero-blink select-none will-change-transform"
              style={{
                top: d.t,
                left: d.l,
                fontSize: d.s,
                animationDelay: d.d,
                animationDuration: `${d.dur}s`
              }}
            >
              {d.el}
            </span>
          ))}
        </div>

        <div className="relative mx-auto max-w-[1200px] px-3 pb-[4.5rem] pt-[3.75rem] sm:px-5 sm:pb-24 sm:pt-[5.25rem]">
          <div className="mx-auto max-w-3xl text-center">
            <h1
              id="home-landing-hero-title"
              className="text-3xl font-bold leading-tight text-[#E60012] [text-shadow:0_0_1px_rgba(255,255,255,0.95),0_1px_2px_rgba(255,255,255,0.85),0_2px_8px_rgba(255,255,255,0.5)] sm:text-4xl md:text-5xl"
            >
              ยินดีต้อนรับ สู่แพลตฟอร์มหัวใจ
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base font-semibold leading-relaxed text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.15)] sm:text-lg">
              เล่นเกม สะสมหัวใจ ช้อปในร้านค้า และติดตามโพสต์ชุมชน — ครบในที่เดียว
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:mt-12 sm:gap-4">
              <Link
                href="/game"
                className="inline-flex min-h-[3rem] min-w-[10rem] items-center justify-center rounded-full bg-white px-6 py-3 text-base font-bold text-[#FF2E8C] shadow-lg transition hover:bg-pink-50"
              >
                เกมและรางวัล
              </Link>
              <Link
                href="/login/line"
                className="inline-flex min-h-[3rem] min-w-[10rem] items-center justify-center gap-2 rounded-full border-2 border-white/40 bg-[#06C755] px-6 py-3 text-base font-bold text-white shadow-lg transition hover:bg-[#05b34c]"
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

      {/* เนื้อหาหลัก — สีพื้นหลังเดียวกับ /central-template */}
      <div className="bg-[#fce7f3]/45">
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
                          <div className="flex flex-col gap-1 px-2 pb-11 pt-2.5">
                            <h3 className="line-clamp-2 text-base font-bold leading-snug text-[#FF2E8C]">{title}</h3>
                            <p className="text-sm text-neutral-500">
                              {plays.toLocaleString("th-TH")} รอบ
                            </p>
                            <p className="text-xs font-medium text-red-600">
                              {creator ? `@${creator}` : "@—"}
                            </p>
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
              actionHref="/page"
              actionLabel="ดูทั้งหมด"
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {POSTS_PLACEHOLDER.map((post) => (
                <article
                  key={post.user + post.time}
                  className="flex flex-col overflow-hidden rounded-2xl border border-pink-100/80 bg-white shadow-sm shadow-pink-100/50"
                >
                  <div className="flex items-center gap-3 border-b border-pink-50 p-4">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF2E8C] to-purple-500 text-sm font-bold text-white"
                      aria-hidden
                    >
                      {post.user.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-neutral-900">{post.user}</p>
                      <p className="text-xs text-neutral-500">{post.time}</p>
                    </div>
                  </div>
                  <p className="grow px-4 py-3 text-sm leading-relaxed text-neutral-700">{post.excerpt}</p>
                  <div className="mx-4 mb-4 h-36 rounded-xl bg-gradient-to-br from-pink-100/80 to-violet-100/80" aria-hidden />
                  <div className="flex items-center justify-between border-t border-pink-50 px-4 py-3 text-sm text-neutral-600">
                    <span className="inline-flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <HeartIcon className="h-4 w-4 text-[#FF2E8C]" />
                        {post.likes}
                      </span>
                      <span className="inline-flex items-center gap-1" aria-hidden>
                        💬 {post.comments}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-semibold text-[#FF2E8C] hover:underline"
                    >
                      <IconShare className="h-4 w-4 shrink-0 text-[#FF2E8C]" />
                      แชร์
                    </button>
                  </div>
                </article>
              ))}
            </div>
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
