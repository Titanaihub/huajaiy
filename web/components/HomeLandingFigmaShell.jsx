"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import BrandLogo from "./BrandLogo";
import HeartIcon from "./HeartIcon";
import NavGamesMenuItem from "./NavGamesMenuItem";
import { useHearts } from "./HeartsProvider";
import { MEMBER_SHELL_MENU_ITEMS } from "../lib/memberSidebarNav";
import {
  TAILADMIN_MY_HEARTS_START,
  TAILADMIN_PROFILE_START,
  workspaceShellUrl
} from "../lib/memberWorkspacePath";
import { useMemberAuth } from "./MemberAuthProvider";
import { heartTotalsFromPublicUser } from "../lib/memberHeartTotals";
import { publicMemberPath } from "../lib/memberPublicUrls";

const HEART_PINK_SRC = "/hearts/pink-heart.png";
const HEART_RED_SRC = "/hearts/red-heart.png";

const navLinkClass =
  "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold text-neutral-800 transition hover:bg-fuchsia-50 hover:text-fuchsia-700";

const iconBtnClass =
  "inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 transition hover:bg-fuchsia-50 hover:text-fuchsia-700";

/**
 * แถบโปรโม + เมนู + Hero ตามแม่แบบ Figma (ชมพู–ม่วง) — ใช้คู่ iframe organic ใต้นี้
 */
export default function HomeLandingFigmaShell({
  onHamburgerClick,
  lineProfileImageUrl,
  profileDisplayName
}) {
  const { user: memberUser, loading: memberLoading, logout } = useMemberAuth();
  const { pinkHearts, redHearts, ready: heartsReady } = useHearts();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  const accountHref = memberUser
    ? workspaceShellUrl(TAILADMIN_PROFILE_START, memberUser.role)
    : "/login";

  let pinkShown = 0;
  let redFromUsersShown = 0;
  let giveawayRedShown = 0;
  let heartsLoading = false;
  if (memberLoading) {
    heartsLoading = true;
  } else if (memberUser) {
    const t = heartTotalsFromPublicUser(memberUser);
    pinkShown = t.pink;
    redFromUsersShown = t.redFromUsers;
    giveawayRedShown = t.giveawayRed;
  } else if (heartsReady) {
    pinkShown = pinkHearts;
    redFromUsersShown = redHearts;
    giveawayRedShown = 0;
  }

  const heartsHref = memberUser
    ? workspaceShellUrl(TAILADMIN_MY_HEARTS_START, memberUser.role)
    : "/login";
  const heartsTitle = memberUser
    ? "หัวใจชมพู · แดงจากผู้เล่น · แดงสำหรับแจก — แตะเพื่อหน้าหัวใจ"
    : "เข้าสู่ระบบเพื่อดูยอดหัวใจ";

  useEffect(() => {
    if (!moreOpen) return;
    function close(e) {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [moreOpen]);

  const floatHearts = [
    { t: "8%", l: "6%", s: 18, o: 0.2, d: "0s" },
    { t: "22%", l: "18%", s: 14, o: 0.25, d: "0.5s" },
    { t: "12%", l: "42%", s: 22, o: 0.18, d: "1s" },
    { t: "35%", l: "55%", s: 16, o: 0.22, d: "0.2s" },
    { t: "18%", l: "78%", s: 20, o: 0.15, d: "1.2s" },
    { t: "55%", l: "8%", s: 15, o: 0.2, d: "0.8s" },
    { t: "48%", l: "88%", s: 24, o: 0.12, d: "0.3s" },
    { t: "68%", l: "28%", s: 17, o: 0.18, d: "1.5s" },
    { t: "72%", l: "62%", s: 19, o: 0.16, d: "0.6s" },
    { t: "28%", l: "92%", s: 13, o: 0.24, d: "0.9s" },
    { t: "5%", l: "62%", s: 16, o: 0.14, d: "1.1s" },
    { t: "82%", l: "45%", s: 21, o: 0.15, d: "0.4s" }
  ];

  return (
    <div className="shrink-0">
      {/* แถบโปรโมชันบน */}
      <div className="bg-gradient-to-r from-fuchsia-600 to-pink-500 px-3 py-2 text-center text-xs font-medium text-white sm:text-sm">
        <span className="inline-flex flex-wrap items-center justify-center gap-1">
          <span aria-hidden>💗</span>
          ยินดีต้อนรับสู่ HUAJAIY — เกม ร้านค้า และชุมชนในที่เดียว · เล่นเกมสะสมหัวใจ แลกรางวัลได้จริง
        </span>
      </div>

      <header className="sticky top-0 z-[1040] border-b border-fuchsia-100/80 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
          <div className="flex flex-col gap-3 py-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-4 lg:gap-y-2">
            {/* โลโก้ + แท็กไลน์ */}
            <div className="flex w-full min-w-0 items-center gap-3 lg:w-auto lg:max-w-xs lg:flex-1">
              {memberUser ? (
                <button
                  type="button"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-800 hover:bg-fuchsia-50 lg:hidden"
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
              ) : (
                <span className="h-10 w-10 shrink-0 lg:hidden" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <BrandLogo variant="header" tone="organic" />
                </div>
                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-fuchsia-600/90 sm:text-xs">
                  Game · Social Feed · Marketplace
                </p>
              </div>
            </div>

            {/* ยอดหัวใจ */}
            <Link
              href={heartsHref}
              className="flex items-center justify-center gap-3 rounded-xl border border-fuchsia-100 bg-fuchsia-50/50 px-3 py-2 lg:justify-start"
              title={heartsTitle}
            >
              <span className="inline-flex items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={HEART_PINK_SRC} alt="" width={22} height={22} className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
                <span className="text-sm font-bold tabular-nums text-pink-600">
                  {heartsLoading ? "…" : pinkShown.toLocaleString("th-TH")}
                </span>
              </span>
              <span className="inline-flex items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={HEART_RED_SRC} alt="" width={22} height={22} className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
                <span className="text-sm font-bold tabular-nums text-red-600">
                  {heartsLoading ? "…" : redFromUsersShown.toLocaleString("th-TH")}
                </span>
              </span>
              <span className="inline-flex items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={HEART_RED_SRC}
                  alt=""
                  width={22}
                  height={22}
                  className="h-5 w-5 rounded-full ring-2 ring-red-200 sm:h-[22px] sm:w-[22px]"
                />
                <span className="text-sm font-bold tabular-nums text-red-800">
                  {heartsLoading ? "…" : giveawayRedShown.toLocaleString("th-TH")}
                </span>
              </span>
            </Link>

            {/* เมนูหลัก */}
            <nav
              className="flex w-full flex-wrap items-center justify-center gap-1 sm:gap-2 lg:flex-1 lg:justify-end"
              aria-label="เมนูหลัก"
            >
              <Link href="/" className={navLinkClass}>
                หน้าแรก
              </Link>
              <Link href="/page" className={navLinkClass}>
                ร้านค้า
              </Link>
              <NavGamesMenuItem navItemClass={navLinkClass} gameLobbyThemed={false} />
              <Link href="/page" className={navLinkClass}>
                ฟีด
              </Link>
              <Link href="/page" className={navLinkClass}>
                เพจ
              </Link>
              {memberLoading ? (
                <span className="px-2 text-sm text-neutral-400">…</span>
              ) : memberUser ? (
                <button
                  type="button"
                  onClick={() => logout()}
                  className={`${navLinkClass} border-0 bg-transparent`}
                >
                  ออกจากระบบ
                </button>
              ) : (
                <Link href="/login" className={navLinkClass}>
                  เข้าสู่ระบบ
                </Link>
              )}
              {memberUser ? (
                <div className="relative" ref={moreRef}>
                  <button
                    type="button"
                    className={`${navLinkClass} inline-flex items-center gap-1`}
                    aria-expanded={moreOpen}
                    onClick={() => setMoreOpen((o) => !o)}
                  >
                    เพิ่มเติม
                    <span className="text-xs opacity-70">▾</span>
                  </button>
                  {moreOpen ? (
                    <ul
                      className="absolute right-0 z-[1100] mt-1 min-w-[14rem] rounded-xl border border-fuchsia-100 bg-white py-1 shadow-lg"
                      role="menu"
                    >
                      {MEMBER_SHELL_MENU_ITEMS.map((item) => (
                        <li key={item.key}>
                          {item.kind === "empty" ? (
                            <span className="block cursor-default px-3 py-2 text-sm text-neutral-400" role="menuitem">
                              {item.label}
                            </span>
                          ) : item.kind === "publicPage" ? (
                            /^[a-z0-9_]{3,32}$/.test(
                              String(memberUser.username || "").trim().toLowerCase()
                            ) ? (
                              <Link
                                href={publicMemberPath(memberUser.username)}
                                className="block px-3 py-2 text-sm text-neutral-800 hover:bg-fuchsia-50"
                                role="menuitem"
                                onClick={() => setMoreOpen(false)}
                              >
                                {item.label}
                              </Link>
                            ) : (
                              <span
                                className="block cursor-default px-3 py-2 text-sm text-neutral-400"
                                role="menuitem"
                              >
                                {item.label}
                              </span>
                            )
                          ) : item.kind === "legacy" && item.href ? (
                            <Link
                              href={item.href}
                              className="block px-3 py-2 text-sm text-neutral-800 hover:bg-fuchsia-50"
                              role="menuitem"
                              onClick={() => setMoreOpen(false)}
                            >
                              {item.label}
                            </Link>
                          ) : (
                            <Link
                              href={workspaceShellUrl(item.tailStart, memberUser.role)}
                              className="block px-3 py-2 text-sm text-neutral-800 hover:bg-fuchsia-50"
                              role="menuitem"
                              onClick={() => setMoreOpen(false)}
                            >
                              {item.label}
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </nav>

            {/* ค้นหา + ไอคอน + CTA */}
            <div className="flex w-full items-center justify-center gap-1 sm:justify-end lg:w-auto lg:shrink-0">
              <Link href="/page" className={iconBtnClass} title="ค้นหา" aria-label="ค้นหา">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" strokeLinecap="round" />
                </svg>
              </Link>
              {lineProfileImageUrl ? (
                <Link href={accountHref} className={`${iconBtnClass} overflow-hidden p-0`} title={profileDisplayName || "บัญชี"}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={lineProfileImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    width={40}
                    height={40}
                    referrerPolicy="no-referrer"
                  />
                </Link>
              ) : (
                <Link href={accountHref} className={iconBtnClass} title="โปรไฟล์" aria-label="โปรไฟล์">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="9" r="3" />
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" d="M17.97 20c-.16-2.892-1.045-5-5.97-5s-5.81 2.108-5.97 5" />
                  </svg>
                </Link>
              )}
              <Link href="/cart" className={iconBtnClass} title="ตะกร้า" aria-label="ตะกร้า">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3.864 16.455c-.858-3.432-1.287-5.147-.386-6.301C4.378 9 6.148 9 9.685 9h4.63c3.538 0 5.306 0 6.207 1.154.901 1.153.472 2.87-.386 6.301-.546 2.183-.818 3.274-1.632 3.91-.814.635-1.939.635-4.189.635h-4.63c-2.25 0-3.375 0-4.189-.635-.814-.636-1.087-1.727-1.632-3.91Z" />
                  <path d="M19.5 9.5-.71-2.605c-.274-1.005-.411-1.507-.692-1.886A2.5 2.5 0 0 0 17 4.172C16.56 4 16.04 4 15 4M4.5 9.5l.71-2.605c.274-1.005.411-1.507.692-1.886A2.5 2.5 0 0 1 7 4.172C7.44 4 7.96 4 9 4" />
                </svg>
              </Link>
              <Link
                href="/login"
                className="ml-1 rounded-full bg-gradient-to-r from-fuchsia-600 to-pink-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-fuchsia-500/25 transition hover:from-fuchsia-700 hover:to-pink-700"
              >
                เข้าสู่ระบบ / สมัคร
              </Link>
            </div>

            {memberUser ? (
              <button
                type="button"
                className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-800 hover:bg-fuchsia-50 lg:inline-flex"
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
            ) : null}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden bg-gradient-to-br from-fuchsia-600 via-fuchsia-700 to-violet-800"
        aria-labelledby="home-figma-hero-title"
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {floatHearts.map((h, i) => (
            <span
              key={i}
              className="absolute animate-pulse text-white"
              style={{
                top: h.t,
                left: h.l,
                opacity: h.o,
                animationDuration: "3s",
                animationDelay: h.d
              }}
            >
              <HeartIcon
                className="text-white drop-shadow-md"
                style={{ width: h.s, height: h.s }}
              />
            </span>
          ))}
        </div>
        <div className="relative mx-auto max-w-4xl px-4 py-14 text-center sm:py-20 md:py-24">
          <h1
            id="home-figma-hero-title"
            className="text-3xl font-bold leading-tight text-white drop-shadow-sm sm:text-4xl md:text-5xl"
          >
            ยินดีต้อนรับสู่แพลตฟอร์มหัวใจ
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/90 sm:text-lg">
            เล่นเกม สะสมหัวใจ ช้อปในร้านค้า และติดตามฟีดชุมชน — ครบในที่เดียว
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/game"
              className="inline-flex min-h-[3rem] min-w-[10rem] items-center justify-center rounded-full bg-white px-6 py-3 text-base font-bold text-fuchsia-700 shadow-lg transition hover:bg-fuchsia-50"
            >
              เกมและรางวัล
            </Link>
            <Link
              href="/login/line"
              className="inline-flex min-h-[3rem] min-w-[10rem] items-center justify-center rounded-full border-2 border-white/40 bg-[#06C755] px-6 py-3 text-base font-bold text-white shadow-lg transition hover:bg-[#05b34c]"
            >
              สมัครผ่าน LINE
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
