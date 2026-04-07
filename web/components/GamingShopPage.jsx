"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import HeartIcon from "./HeartIcon";
import { useMemberAuth } from "./MemberAuthProvider";
import { PUBLIC_SHOP_PATH } from "../lib/publicNavPaths";

const HEART_PINK_SRC = "/hearts/pink-heart.png";
const HEART_RED_SRC = "/hearts/red-heart.png";

const CATEGORIES = [
  { id: "all", label: "ทั้งหมด" },
  { id: "accessory", label: "อุปกรณ์เสริม" },
  { id: "audio", label: "เสียง" },
  { id: "controller", label: "จอยเกม" },
  { id: "furniture", label: "เฟอร์นิเจอร์" },
  { id: "monitor", label: "จอมอนิเตอร์" }
];

const SHOP_PRODUCTS = [
  {
    id: "a",
    catLabel: "อุปกรณ์เสริม",
    catKey: "accessory",
    name: "เมาส์เกมมิ่ง Pro",
    price: "599",
    was: "799",
    discountPct: 25,
    stars: 5,
    icon: "🖱️"
  },
  {
    id: "b",
    catLabel: "จอยเกม",
    catKey: "controller",
    name: "คอนโทรลเลอร์ไร้สาย X",
    price: "1,890",
    was: "2,290",
    discountPct: 17,
    stars: 5,
    icon: "🎮"
  },
  {
    id: "c",
    catLabel: "เสียง",
    catKey: "audio",
    name: "หูฟังเกมมิ่ง 7.1",
    price: "2,490",
    was: "2,990",
    discountPct: 17,
    stars: 4,
    icon: "🎧"
  },
  {
    id: "d",
    catLabel: "อุปกรณ์เสริม",
    catKey: "accessory",
    name: "คีย์บอร์ดเมคานิคัล RGB",
    price: "3,290",
    was: "3,990",
    discountPct: 18,
    stars: 5,
    icon: "⌨️"
  },
  {
    id: "e",
    catLabel: "จอมอนิเตอร์",
    catKey: "monitor",
    name: "จอเกม 27\" 165Hz",
    price: "8,900",
    was: "10,500",
    discountPct: 15,
    stars: 5,
    icon: "🖥️"
  },
  {
    id: "f",
    catLabel: "เฟอร์นิเจอร์",
    catKey: "furniture",
    name: "เก้าอี้เกมมิ่ง Ergo",
    price: "4,590",
    was: "5,990",
    discountPct: 23,
    stars: 4,
    icon: "🪑"
  },
  {
    id: "g",
    catLabel: "จอยเกม",
    catKey: "controller",
    name: "จอย Arcade USB",
    price: "890",
    was: "1,190",
    discountPct: 25,
    stars: 4,
    icon: "🕹️"
  },
  {
    id: "h",
    catLabel: "เสียง",
    catKey: "audio",
    name: "ไมโครโฟนคอนเดนเซอร์",
    price: "1,290",
    was: "1,590",
    discountPct: 19,
    stars: 5,
    icon: "🎙️"
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

function IconStar({ className, filled }) {
  if (filled) {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
        <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6-4.6-6 4.6 2.3-7-6-4.6h7.6L12 2z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6-4.6-6 4.6 2.3-7-6-4.6h7.6L12 2z" />
    </svg>
  );
}

function IconFunnel({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 5h16l-6 7v6l-4 2v-8L4 5z" strokeLinejoin="round" />
    </svg>
  );
}

function StarRow({ n }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`คะแนน ${n} จาก 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <IconStar
          key={i}
          className={`h-3.5 w-3.5 ${i <= n ? "text-amber-400" : "text-neutral-300"}`}
          filled={i <= n}
        />
      ))}
    </span>
  );
}

/**
 * หน้าร้านค้าเกมมิ่งสาธารณะ — /shop (เทมเพลตตามแม่แบบ)
 */
export default function GamingShopPage() {
  const router = useRouter();
  const { user: memberUser } = useMemberAuth();
  const [activeCat, setActiveCat] = useState("all");

  const onHamburgerClick = useCallback(() => {
    router.push("/member");
  }, [router]);

  const filtered = useMemo(
    () =>
      activeCat === "all" ? SHOP_PRODUCTS : SHOP_PRODUCTS.filter((p) => p.catKey === activeCat),
    [activeCat]
  );

  const navBase =
    "relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-2 text-sm font-semibold transition sm:gap-2 sm:px-3";
  const navInactive = `${navBase} text-neutral-800 hover:bg-pink-50 hover:text-[#FF2E8C]`;
  const navActive = `${navBase} bg-pink-100 text-[#FF2E8C]`;

  function hamburgerButton(className) {
    return (
      <button type="button" className={className} aria-label="เปิดเมนูด้านข้าง" onClick={onHamburgerClick}>
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
      className="relative z-20 flex w-full min-w-0 flex-wrap items-center justify-center gap-x-0.5 gap-y-1 lg:flex-1 lg:justify-center"
      aria-label="เมนูหลัก"
    >
      <Link href="/" className={`${navInactive} cursor-pointer`}>
        <IconHome className="h-4 w-4 shrink-0 text-[#FF2E8C]" />
        หน้าแรก
      </Link>
      <Link href={PUBLIC_SHOP_PATH} className={`${navActive} cursor-pointer`}>
        <IconShop className="h-4 w-4 shrink-0 text-[#FF2E8C]" />
        ร้านค้า
      </Link>
      <Link href="/game" className={`${navInactive} cursor-pointer`}>
        <IconGamepad className="h-4 w-4 shrink-0 text-[#FF2E8C]" />
        <span className="relative inline-block">
          เกม
          <span
            className="pointer-events-none absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF2E8C] text-[9px] leading-none text-white shadow-sm"
            aria-hidden
          >
            ★
          </span>
        </span>
      </Link>
      <Link href="/page#community-lobby" className={`${navInactive} cursor-pointer`}>
        <IconFeed className="h-4 w-4 shrink-0 text-[#FF2E8C]" />
        โพสต์
      </Link>
      <Link href="/page#member-pages" className={`${navInactive} cursor-pointer`}>
        <IconPage className="h-4 w-4 shrink-0 text-[#FF2E8C]" />
        เพจ
      </Link>
    </nav>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f4f4f6]">
      <header className="sticky top-0 z-[1040] border-b border-pink-100 bg-white shadow-[0_1px_0_0_rgba(233,30,140,0.06)]">
        <div className="mx-auto max-w-[1200px] px-3 py-2.5 sm:px-5 sm:py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
            <div className="flex items-center justify-between gap-2 lg:shrink-0">
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
                เข้าสู่ระบบ / สมัครสมาชิก
              </Link>
            </div>
            {mainNav}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 lg:shrink-0 lg:justify-end">
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
                เข้าสู่ระบบ / สมัครสมาชิก
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

      {/* Hero ร้านค้า */}
      <section
        className="relative overflow-hidden bg-gradient-to-r from-[#8B1453] via-[#c21b6d] to-[#F0DE7A]"
        aria-labelledby="shop-hero-title"
      >
        <div className="relative mx-auto flex max-w-[1200px] flex-col gap-6 px-3 py-[3.75rem] sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-[5.25rem]">
          <div className="max-w-2xl text-center sm:text-left">
            <h1 id="shop-hero-title" className="text-3xl font-bold leading-tight text-white drop-shadow-md sm:text-4xl md:text-5xl">
              ร้านค้าเกมมิ่ง
            </h1>
            <p className="mt-3 text-base text-white/95 sm:text-lg">ค้นพบดีลสุดคุ้มสำหรับอุปกรณ์เกมมิ่ง</p>
          </div>
          <Link
            href="/cart"
            className="mx-auto flex shrink-0 items-center gap-3 rounded-2xl border border-white/30 bg-white/15 px-5 py-4 text-white shadow-lg backdrop-blur-sm transition hover:bg-white/25 sm:mx-0"
          >
            <IconCart className="h-8 w-8 shrink-0" />
            <div className="text-left text-sm leading-tight">
              <p className="font-bold">ตะกร้า</p>
              <p className="text-white/90">
                <span className="tabular-nums">0</span> ชิ้น · ฿0
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* หมวดหมู่ + สินค้า */}
      <div className="mx-auto w-full max-w-[1200px] flex-1 px-3 py-8 sm:px-5 sm:py-10">
        <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
            <IconFunnel className="h-5 w-5 text-[#FF2E8C]" aria-hidden />
            หมวดหมู่:
          </span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCat(c.id)}
                className={
                  activeCat === c.id
                    ? "rounded-full bg-gradient-to-r from-[#FF2E8C] to-[#f472b6] px-4 py-2 text-sm font-bold text-white shadow-md shadow-pink-400/25"
                    : "rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-pink-200 hover:text-[#FF2E8C]"
                }
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="relative flex flex-col rounded-2xl border border-pink-100/80 bg-white shadow-sm shadow-pink-100/50 transition-transform transition-shadow duration-200 ease-out will-change-transform hover:scale-[1.04] hover:shadow-md"
            >
              <span className="absolute left-3 top-3 z-[1] rounded-full bg-gradient-to-r from-[#FF2E8C] to-[#f472b6] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                {p.discountPct}% OFF
              </span>
              <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-t-2xl bg-gradient-to-br from-slate-100 to-pink-50/80 text-5xl">
                {p.icon}
              </div>
              <div className="flex flex-1 flex-col rounded-b-2xl p-4">
                <p className="text-xs font-semibold text-purple-700">{p.catLabel}</p>
                <h2 className="mt-1 text-base font-bold text-neutral-900">{p.name}</h2>
                <div className="mt-2">
                  <StarRow n={p.stars} />
                </div>
                <p className="mt-2 text-lg font-bold text-[#FF2E8C]">฿{p.price}</p>
                <p className="text-sm font-medium text-[#E60012] line-through decoration-neutral-700 decoration-2">฿{p.was}</p>
                <Link
                  href="/cart"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#FF2E8C] to-[#f472b6] py-2.5 text-sm font-bold text-white shadow-md shadow-pink-400/20 transition hover:brightness-105"
                >
                  ซื้อเลย
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="mt-auto border-t border-pink-100 bg-white">
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
  );
}
