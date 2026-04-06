"use client";

import Link from "next/link";
import HeartIcon from "./HeartIcon";
import { useMemberAuth } from "./MemberAuthProvider";

const HEART_PINK_SRC = "/hearts/pink-heart.png";
const HEART_RED_SRC = "/hearts/red-heart.png";

const GAMES_PLACEHOLDER = [
  { title: "Farm Life", cat: "@Simulation", rating: "4.4", users: "1.2k", badge: "NEW", icon: "🏡" },
  { title: "Strike Zone", cat: "@Shooter", rating: "4.6", users: "890", badge: "HOT", icon: "🎯" },
  { title: "Blade Arena", cat: "@Action", rating: "4.3", users: "2.1k", badge: "HOT", icon: "⚔️" },
  { title: "Speed Rush", cat: "@Racing", rating: "4.5", users: "756", badge: null, icon: "🏎️" }
];

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

function IconHome({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" strokeLinejoin="round" />
    </svg>
  );
}

function IconShop({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 8h15l-1 12H7L6 8zm0 0L5 3H2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="21" r="1" />
      <circle cx="18" cy="21" r="1" />
    </svg>
  );
}

function IconGamepad({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 11h4M8 9v4M14 10h.01M18 10h.01M15 15h-1v-1h1v1z" strokeLinecap="round" />
      <rect x="2" y="6" width="20" height="12" rx="4" />
    </svg>
  );
}

function IconFeed({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16" strokeLinecap="round" />
      <circle cx="5" cy="19" r="1" fill="currentColor" />
    </svg>
  );
}

function IconPage({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
    </svg>
  );
}

function IconSearch({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

function IconCart({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M3.864 16.455c-.858-3.432-1.287-5.147-.386-6.301C4.378 9 6.148 9 9.685 9h4.63c3.538 0 5.306 0 6.207 1.154.901 1.153.472 2.87-.386 6.301-.546 2.183-.818 3.274-1.632 3.91-.814.635-1.939.635-4.189.635h-4.63c-2.25 0-3.375 0-4.189-.635-.814-.636-1.087-1.727-1.632-3.91Z" />
      <path d="M19.5 9.5-.71-2.605c-.274-1.005-.411-1.507-.692-1.886A2.5 2.5 0 0 0 17 4.172C16.56 4 16.04 4 15 4M4.5 9.5l.71-2.605c.274-1.005.411-1.507.692-1.886A2.5 2.5 0 0 1 7 4.172C7.44 4 7.96 4 9 4" />
    </svg>
  );
}

function IconUser({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="12" cy="9" r="3" />
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" d="M17.97 20c-.16-2.892-1.045-5-5.97-5s-5.81 2.108-5.97 5" />
    </svg>
  );
}

function IconStar({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6-4.6-6 4.6 2.3-7-6-4.6h7.6L12 2z" />
    </svg>
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
 * หน้าแรก — เทมเพลตตามแม่แบบ (แถบนำทางพื้นขาวแถวบนสุด + hero ไล่สี + เกม/สินค้า/โพสต์ placeholder)
 * ลิงก์เมนูใช้เส้นทางเดิมของเว็บ; ข้อมูลการ์ดเป็นตัวอย่างจนกว่าจะผูก API
 */
export default function HomeLandingFigmaShell({
  onHamburgerClick,
  lineProfileImageUrl: _lineProfileImageUrl,
  profileDisplayName: _profileDisplayName
}) {
  const { user: memberUser } = useMemberAuth();

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

  const navTopClass =
    "relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-pink-50 hover:text-[#FF2E8C] sm:gap-2 sm:px-3";

  function hamburgerButton(className) {
    return (
      <button
        type="button"
        className={className}
        aria-label="เปิดเมนูด้านข้าง"
        onClick={onHamburgerClick}
      >
        <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden>
          <path
            fill="currentColor"
            d="M2 6a1 1 0 0 1 1-1h18a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1zm0 6.032a1 1 0 0 1 1-1h18a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1zm1 5.033a1 1 0 1 0 0 2h18a1 1 0 0 0 0-2H3z"
          />
        </svg>
      </button>
    );
  }

  const heartsPill = (
    <div
      className="flex items-center gap-2.5 rounded-full border border-pink-200/90 bg-gradient-to-r from-pink-50 to-fuchsia-50 px-3 py-1.5 shadow-sm sm:gap-3 sm:px-4 sm:py-2"
      aria-label="ยอดหัวใจตัวอย่าง"
    >
      <span className="inline-flex items-center gap-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HEART_PINK_SRC} alt="" width={20} height={20} className="h-5 w-5" />
        <span className="text-sm font-bold tabular-nums text-pink-600">0</span>
      </span>
      <span className="inline-flex items-center gap-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HEART_RED_SRC} alt="" width={20} height={20} className="h-5 w-5" />
        <span className="text-sm font-bold tabular-nums text-red-600">0</span>
      </span>
      <span className="inline-flex items-center gap-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HEART_RED_SRC}
          alt=""
          width={20}
          height={20}
          className="h-5 w-5 rounded-full ring-2 ring-red-200"
        />
        <span className="text-sm font-bold tabular-nums text-red-800">0</span>
      </span>
    </div>
  );

  const iconBtnClass =
    "inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-700 transition hover:bg-pink-50 hover:text-[#FF2E8C] sm:h-10 sm:w-10";

  const mainNav = (
    <nav
      className="flex flex-wrap items-center justify-center gap-x-0.5 gap-y-1 lg:justify-center"
      aria-label="เมนูหลัก"
    >
      <Link href="/" className={navTopClass}>
        <IconHome className="h-4 w-4 shrink-0 text-[#FF2E8C]" />
        หน้าแรก
      </Link>
      <Link href="/page" className={navTopClass}>
        <IconShop className="h-4 w-4 shrink-0 text-[#FF2E8C]" />
        ร้านค้า
      </Link>
      <Link href="/game" className={navTopClass}>
        <IconGamepad className="h-4 w-4 shrink-0 text-[#FF2E8C]" />
        <span className="relative inline-block">
          เกม
          <span
            className="absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF2E8C] text-[9px] leading-none text-white shadow-sm"
            aria-hidden
          >
            ★
          </span>
        </span>
      </Link>
      <Link href="/page" className={navTopClass}>
        <IconFeed className="h-4 w-4 shrink-0 text-[#FF2E8C]" />
        โพสต์
      </Link>
      <Link href="/page" className={navTopClass}>
        <IconPage className="h-4 w-4 shrink-0 text-[#FF2E8C]" />
        เพจ
      </Link>
    </nav>
  );

  return (
    <div className="shrink-0">
      {/* แถบนำทางบนสุด — พื้นขาว (โลโก้ | เมนู | หัวใจ + ไอคอน) */}
      <header className="sticky top-0 z-[1040] border-b border-pink-100 bg-white shadow-[0_1px_0_0_rgba(233,30,140,0.06)]">
        <div className="mx-auto max-w-[1200px] px-3 py-2.5 sm:px-5 sm:py-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,auto)_1fr_minmax(0,auto)] lg:items-center lg:gap-5">
            <div className="flex items-center justify-between gap-2 lg:justify-start">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                {memberUser
                  ? hamburgerButton(
                      "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-neutral-800 hover:bg-pink-50 lg:hidden"
                    )
                  : null}
                <Link href="/" className="group inline-flex min-w-0 items-center gap-2 sm:gap-2.5">
                  <HeartIcon className="h-9 w-9 shrink-0 text-[#FF2E8C] sm:h-10 sm:w-10" aria-hidden />
                  <span className="font-heading truncate text-lg font-bold uppercase tracking-tight text-neutral-900 sm:text-xl">
                    HUAJAIY
                  </span>
                </Link>
              </div>
              <Link
                href="/login"
                className="shrink-0 rounded-full bg-gradient-to-r from-[#FF2E8C] to-[#f472b6] px-3 py-2 text-xs font-bold text-white shadow-sm shadow-pink-400/25 transition hover:brightness-105 lg:hidden sm:px-4 sm:text-sm"
              >
                เข้าสู่ระบบ / สมัคร
              </Link>
            </div>

            {mainNav}

            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 lg:justify-end">
              {heartsPill}
              <div className="flex items-center gap-0.5 sm:gap-1">
                <Link href="/page" className={iconBtnClass} aria-label="ค้นหา">
                  <IconSearch className="h-5 w-5" />
                </Link>
                <Link href="/login" className={iconBtnClass} aria-label="โปรไฟล์">
                  <IconUser className="h-5 w-5" />
                </Link>
                <Link href="/cart" className={iconBtnClass} aria-label="ตะกร้า">
                  <IconCart className="h-5 w-5" />
                </Link>
              </div>
              <Link
                href="/login"
                className="hidden rounded-full bg-gradient-to-r from-[#FF2E8C] to-[#f472b6] px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-pink-400/25 transition hover:brightness-105 lg:inline-flex"
              >
                เข้าสู่ระบบ / สมัคร
              </Link>
              {memberUser
                ? hamburgerButton(
                    "hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl text-neutral-800 hover:bg-pink-50 lg:inline-flex"
                  )
                : null}
            </div>
          </div>
        </div>
      </header>

      {/* Hero — ไล่เฉดชมพูบานเย็น + ไอคอนกระพริบในพื้นหลัง */}
      <section
        className="relative overflow-hidden bg-gradient-to-r from-[#ffb8d9] via-[#ff7eb8] to-[#ff4d9a]"
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

        <div className="relative mx-auto max-w-[1200px] px-3 pb-12 pt-10 sm:px-5 sm:pb-16 sm:pt-14">
          <div className="mx-auto max-w-3xl text-center">
            <h1
              id="home-landing-hero-title"
              className="text-3xl font-bold leading-tight text-[#E60012] [text-shadow:0_0_1px_rgba(255,255,255,0.95),0_1px_2px_rgba(255,255,255,0.85),0_2px_8px_rgba(255,255,255,0.5)] sm:text-4xl md:text-5xl"
            >
              ยินดีต้อนรับสู่แพลตฟอร์มหัวใจ
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base font-semibold text-[#E60012] [text-shadow:0_0_1px_rgba(255,255,255,0.9),0_1px_3px_rgba(255,255,255,0.75)] sm:text-lg">
              เล่นเกม สะสมหัวใจ ช้อปในร้านค้า และติดตามโพสต์ชุมชน — ครบในที่เดียว
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
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

      {/* เนื้อหาหลัก — พื้นหลังอ่อน */}
      <div className="bg-[#f4f4f6]">
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {GAMES_PLACEHOLDER.map((g) => (
                <Link
                  key={g.title}
                  href="/game"
                  className="group relative flex flex-col rounded-2xl border border-pink-100/80 bg-white p-4 shadow-sm shadow-pink-100/50 transition-transform transition-shadow duration-200 ease-out will-change-transform hover:scale-[1.04] hover:shadow-md"
                >
                  {g.badge ? (
                    <span className="absolute right-3 top-3 z-[1] rounded-full bg-gradient-to-r from-[#FF2E8C] to-[#f472b6] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      {g.badge}
                    </span>
                  ) : null}
                  <div className="relative mb-3 flex h-24 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-pink-50 to-fuchsia-50 text-4xl">
                    {g.icon}
                  </div>
                  <p className="text-xs font-semibold text-[#E60012]">{g.cat}</p>
                  <div className="mt-1 flex items-center gap-1 text-amber-500">
                    <IconStar className="h-3.5 w-3.5" />
                    <span className="text-sm font-bold text-neutral-800">{g.rating}</span>
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-neutral-900 group-hover:text-[#FF2E8C]">{g.title}</h3>
                  <p className="mt-2 flex items-center gap-1 text-sm text-neutral-500">
                    <span aria-hidden>👤</span>
                    {g.users} คนเล่น
                  </p>
                </Link>
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
              actionHref="/page"
              actionLabel="ดูทั้งหมด"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PRODUCTS_PLACEHOLDER.map((p) => (
                <div
                  key={p.name}
                  className="relative flex flex-col overflow-hidden rounded-2xl border border-pink-100/80 bg-white shadow-sm shadow-pink-100/50"
                >
                  <span className="absolute right-3 top-3 z-10 rounded-full bg-gradient-to-r from-[#FF2E8C] to-[#f472b6] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    HOT
                  </span>
                  <div className="flex h-40 items-center justify-center bg-gradient-to-br from-slate-50 to-pink-50/80 text-5xl">
                    {p.icon}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-bold text-neutral-900">{p.name}</h3>
                    <p className="mt-2 text-lg font-bold text-[#FF2E8C]">฿{p.price}</p>
                    <p className="text-sm text-neutral-400 line-through">฿{p.was}</p>
                    <Link
                      href="/page"
                      className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#FF2E8C] to-[#f472b6] py-2.5 text-sm font-bold text-white shadow-md shadow-pink-400/20 transition hover:brightness-105"
                    >
                      ซื้อเลยตอนนี้
                    </Link>
                  </div>
                </div>
              ))}
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
                      className="font-semibold text-[#FF2E8C] hover:underline"
                    >
                      แชร์
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        {/* ฟุตเตอร์ตามแบบ */}
        <footer className="border-t border-pink-100 bg-white">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-3 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <Link href="/" className="inline-flex items-center gap-2">
              <HeartIcon className="h-8 w-8 text-[#FF2E8C]" />
              <span className="font-heading text-lg font-bold uppercase text-[#FF2E8C]">HUAJAIY</span>
            </Link>
            <p className="text-center text-sm text-neutral-600 sm:text-left">
              © {new Date().getFullYear()} HUAJAIY สงวนลิขสิทธิ์ทั้งหมด
            </p>
            <Link
              href="/contact"
              className="inline-flex w-fit items-center justify-center self-center rounded-full bg-gradient-to-r from-[#FF2E8C] to-[#f472b6] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-pink-400/25 transition hover:brightness-105 sm:self-auto"
            >
              ติดต่อเรา
            </Link>
          </div>
          <div className="border-t border-pink-50 bg-pink-50/30">
            <nav
              className="mx-auto flex max-w-[1200px] flex-wrap justify-center gap-x-4 gap-y-2 px-3 py-3 text-xs text-neutral-500 sm:px-5"
              aria-label="ลิงก์กฎหมาย"
            >
              <Link href="/privacy" className="hover:text-[#FF2E8C] hover:underline">
                นโยบายความเป็นส่วนตัว
              </Link>
              <span aria-hidden>·</span>
              <Link href="/terms" className="hover:text-[#FF2E8C] hover:underline">
                ข้อกำหนดการให้บริการ
              </Link>
              <span aria-hidden>·</span>
              <Link href="/data-deletion" className="hover:text-[#FF2E8C] hover:underline">
                การลบข้อมูล
              </Link>
            </nav>
          </div>
        </footer>
      </div>
    </div>
  );
}
