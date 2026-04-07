"use client";

import Link from "next/link";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import HeartIcon from "./HeartIcon";
import { useMemberAuth } from "./MemberAuthProvider";
import { PUBLIC_SHOP_PATH } from "../lib/publicNavPaths";

const HEART_PINK_SRC = "/hearts/pink-heart.png";
const HEART_RED_SRC = "/hearts/red-heart.png";

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

/**
 * เชลล์หน้าเกม — เมนูบนแบบเดียวกับหน้าแรก/ร้านค้า · เมนู「เกม」เป็น active + ดาว
 */
export default function GameLandingFigmaShell({ children }) {
  const router = useRouter();
  const { user: memberUser } = useMemberAuth();

  const onHamburgerClick = useCallback(() => {
    router.push("/member");
  }, [router]);

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
      <Link href={PUBLIC_SHOP_PATH} className={`${navInactive} cursor-pointer`}>
        <IconShop className="h-4 w-4 shrink-0 text-[#FF2E8C]" />
        ร้านค้า
      </Link>
      <Link href="/game" className={`${navActive} cursor-pointer`} aria-current="page">
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
    <div className="flex min-h-screen w-full flex-col bg-white">
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
      {children}
    </div>
  );
}
