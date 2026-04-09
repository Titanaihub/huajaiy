"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import HeartIcon from "./HeartIcon";
import {
  LineLoginPinkPillInner,
  lineLoginPinkPillClassName
} from "./LineLoginPinkPill";
import { useHearts } from "./HeartsProvider";
import { useMemberAuth } from "./MemberAuthProvider";
import { heartTotalsFromPublicUser } from "../lib/memberHeartTotals";
import { MEMBER_SHELL_MENU_ITEMS } from "../lib/memberSidebarNav";
import { publicMemberPath } from "../lib/memberPublicUrls";
import {
  TAILADMIN_MY_HEARTS_START,
  TAILADMIN_PINK_HISTORY_START,
  TAILADMIN_SHOP_DASHBOARD_START,
  workspaceShellUrl
} from "../lib/memberWorkspacePath";

const HEART_PINK_SRC = "/hearts/pink-heart.png";
const HEART_RED_SRC = "/hearts/red-heart.png";

export function IconHome({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconShop({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 8h15l-1 12H7L6 8zm0 0L5 3H2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="21" r="1" />
      <circle cx="18" cy="21" r="1" />
    </svg>
  );
}

export function IconGamepad({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 11h4M8 9v4M14 10h.01M18 10h.01M15 15h-1v-1h1v1z" strokeLinecap="round" />
      <rect x="2" y="6" width="20" height="12" rx="4" />
    </svg>
  );
}

export function IconFeed({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16" strokeLinecap="round" />
      <circle cx="5" cy="19" r="1" fill="currentColor" />
    </svg>
  );
}

export function IconPage({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
    </svg>
  );
}

export function IconSearch({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

export function IconCart({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M3.864 16.455c-.858-3.432-1.287-5.147-.386-6.301C4.378 9 6.148 9 9.685 9h4.63c3.538 0 5.306 0 6.207 1.154.901 1.153.472 2.87-.386 6.301-.546 2.183-.818 3.274-1.632 3.91-.814.635-1.939.635-4.189.635h-4.63c-2.25 0-3.375 0-4.189-.635-.814-.636-1.087-1.727-1.632-3.91Z" />
      <path d="M19.5 9.5-.71-2.605c-.274-1.005-.411-1.507-.692-1.886A2.5 2.5 0 0 0 17 4.172C16.56 4 16.04 4 15 4M4.5 9.5l.71-2.605c.274-1.005.411-1.507.692-1.886A2.5 2.5 0 0 1 7 4.172C7.44 4 7.96 4 9 4" />
    </svg>
  );
}

export function IconUser({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="12" cy="9" r="3" />
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" d="M17.97 20c-.16-2.892-1.045-5-5.97-5s-5.81 2.108-5.97 5" />
    </svg>
  );
}

/** แชร์แบบจุดเชื่อมเส้น (share-nodes) — สีจาก currentColor เช่น text-[#FF2E8C] */
export function IconShare({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

/**
 * โครงหน้าแบบกลาง: แถบบน + แถบสีแบรนด์ชมพู (80px, ไม่ไล่เฉด) + เนื้อหา + ฟุตเตอร์
 */
/**
 * @typedef {'home' | 'game' | 'posts' | 'page'} CentralNavActiveKey
 */

export default function HuajaiyCentralTemplate({
  children,
  /** @deprecated เคยเปิดเมนูสมาชิก — ปุ่มแฮมเบอร์เกอร์ถูกถอดออกจากเฮดเดอร์ */
  onHamburgerClick: _unusedHamburger,
  lineProfileImageUrl,
  profileDisplayName,
  /** แสดงในแถบชมพูด้านล่างเฮดเดอร์ ต่อท้ายโลโก้/ชื่อเว็บ (เช่น ชื่อเมนูหน้าสมาชิก) */
  pinkBarMenuLabel,
  /** ไฮไลต์เมนูหลัก (หน้าแรก / เกม / โพสต์ / เพจ) — ให้ตรงกับเทมเพลตกลาง */
  activeNavKey = null,
  mainClassName = "flex min-w-0 flex-1 flex-col"
}) {
  const { user: memberUser, loading: memberLoading, logout } = useMemberAuth();
  const { pinkHearts, redHearts, ready: heartsReady } = useHearts();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

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

  function renderMoreMenuItems() {
    if (!memberUser) return null;
    return MEMBER_SHELL_MENU_ITEMS.map((item) =>
      item.kind === "empty" ? (
        <span
          key={item.key}
          className="block cursor-default px-3 py-2 text-sm text-gray-400"
          role="menuitem"
        >
          {item.label}
        </span>
      ) : item.kind === "publicPage" ? (
        /^[a-z0-9_]{3,32}$/.test(String(memberUser.username || "").trim().toLowerCase()) ? (
          <Link
            key={item.key}
            href={publicMemberPath(memberUser.username)}
            className="block px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
            role="menuitem"
            onClick={() => setMoreOpen(false)}
          >
            {item.label}
          </Link>
        ) : (
          <span
            key={item.key}
            className="block cursor-default px-3 py-2 text-sm text-gray-400"
            role="menuitem"
            title="ตั้งชื่อผู้ใช้ในโปรไฟล์ก่อน"
          >
            {item.label}
          </span>
        )
      ) : item.kind === "legacy" && item.href ? (
        <Link
          key={item.key}
          href={item.href}
          className="block px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
          role="menuitem"
          onClick={() => setMoreOpen(false)}
        >
          {item.label}
        </Link>
      ) : (
        <Link
          key={item.key}
          href={workspaceShellUrl(item.tailStart, memberUser.role)}
          className="block px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
          role="menuitem"
          onClick={() => setMoreOpen(false)}
        >
          {item.label}
        </Link>
      )
    );
  }

  const navTopClass =
    "relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-pink-50 hover:text-[#FF2E8C] sm:gap-2 sm:px-3";

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

  const loginForHeartsHref = "/login";
  const pinkHistoryHref = memberUser
    ? workspaceShellUrl(TAILADMIN_PINK_HISTORY_START, memberUser.role)
    : loginForHeartsHref;
  const redFromCreatorsHref = memberUser
    ? workspaceShellUrl(TAILADMIN_MY_HEARTS_START, memberUser.role)
    : loginForHeartsHref;
  const redGiveawayHistoryHref = memberUser
    ? "/account/heart-history/giveaway"
    : loginForHeartsHref;
  const profileHref = memberUser
    ? workspaceShellUrl(TAILADMIN_SHOP_DASHBOARD_START, memberUser.role)
    : "/login";

  const heartSegClass =
    "inline-flex items-center gap-1 rounded-md px-0.5 py-0.5 outline-offset-2 transition hover:bg-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400";

  const heartsPill = (
    <div
      className="flex items-center gap-2.5 rounded-full border border-pink-200/90 bg-gradient-to-r from-pink-50 to-fuchsia-50 px-3 py-1.5 shadow-sm transition hover:brightness-[1.02] sm:gap-3 sm:px-4 sm:py-2"
      role="group"
      aria-label={memberUser ? "ยอดหัวใจ — แตะแต่ละยอดเพื่อไปหน้าที่เกี่ยวข้อง" : "เข้าสู่ระบบเพื่อดูยอดหัวใจ"}
    >
      <Link
        href={pinkHistoryHref}
        className={heartSegClass}
        title="ประวัติหัวใจชมพู"
        aria-label="ประวัติหัวใจชมพู"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HEART_PINK_SRC} alt="" width={20} height={20} className="h-5 w-5" />
        <span className="text-sm font-bold tabular-nums text-pink-600">
          {heartsLoading ? "…" : pinkShown.toLocaleString("th-TH")}
        </span>
      </Link>
      <Link
        href={redFromCreatorsHref}
        className={heartSegClass}
        title="หัวใจแดงจากผู้สร้าง"
        aria-label="หัวใจแดงจากผู้สร้าง"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HEART_RED_SRC} alt="" width={20} height={20} className="h-5 w-5" />
        <span className="text-sm font-bold tabular-nums text-red-600">
          {heartsLoading ? "…" : redFromUsersShown.toLocaleString("th-TH")}
        </span>
      </Link>
      <Link
        href={redGiveawayHistoryHref}
        className={heartSegClass}
        title="ประวัติหัวใจแดงสำหรับแจก"
        aria-label="ประวัติหัวใจแดงสำหรับแจก"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HEART_RED_SRC}
          alt=""
          width={20}
          height={20}
          className="h-5 w-5 rounded-full ring-2 ring-red-200"
        />
        <span className="text-sm font-bold tabular-nums text-red-800">
          {heartsLoading ? "…" : giveawayRedShown.toLocaleString("th-TH")}
        </span>
      </Link>
    </div>
  );

  const iconBtnClass =
    "inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-700 transition hover:bg-pink-50 hover:text-[#FF2E8C] sm:h-10 sm:w-10";

  const navInactive = `${navTopClass} cursor-pointer`;
  const navActive = `${navTopClass} cursor-pointer bg-pink-100 text-[#FF2E8C]`;

  /** ผู้ที่ยังไม่ล็อกอิน: ไม่ไฮไลต์เมนู (ไม่มีแคปซูลชมพูบนรายการที่ active) */
  function navClass(key) {
    if (!memberUser) return navInactive;
    return activeNavKey === key ? navActive : navInactive;
  }

  const pinkBarSuffix = String(pinkBarMenuLabel || "").trim();

  const mainNav = (
    <nav
      className="relative z-20 flex w-full min-w-0 flex-wrap items-center justify-center gap-x-0.5 gap-y-1 lg:flex-1 lg:justify-center"
      aria-label="เมนูหลัก"
    >
      <Link
        href="/"
        className={navClass("home")}
        aria-current={memberUser && activeNavKey === "home" ? "page" : undefined}
      >
        <IconHome className="h-4 w-4 shrink-0 text-[#FF2E8C]" />
        หน้าแรก
      </Link>
      <Link
        href="/game"
        className={navClass("game")}
        aria-current={memberUser && activeNavKey === "game" ? "page" : undefined}
      >
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
      <Link
        href="/posts"
        className={navClass("posts")}
        aria-current={memberUser && activeNavKey === "posts" ? "page" : undefined}
      >
        <IconFeed className="h-4 w-4 shrink-0 text-[#FF2E8C]" />
        โพสต์
      </Link>
      <Link
        href="/pages"
        className={navClass("page")}
        aria-current={memberUser && activeNavKey === "page" ? "page" : undefined}
      >
        <IconPage className="h-4 w-4 shrink-0 text-[#FF2E8C]" />
        เพจ
      </Link>
    </nav>
  );

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-white">
      <header className="sticky top-0 z-[1040] border-b border-pink-100 bg-white shadow-[0_1px_0_0_rgba(233,30,140,0.06)]">
        <div className="mx-auto max-w-[1200px] px-3 py-2.5 sm:px-5 sm:py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
            <div className="flex items-center justify-between gap-2 lg:shrink-0">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <Link href="/" className="group inline-flex min-w-0 items-center gap-2 sm:gap-2.5">
                  <HeartIcon className="h-9 w-9 shrink-0 text-[#FF2E8C] sm:h-10 sm:w-10" aria-hidden />
                  <span className="font-heading truncate text-lg font-bold uppercase tracking-tight text-neutral-900 sm:text-xl">
                    HUAJAIY
                  </span>
                </Link>
              </div>
              {!memberUser ? (
                <Link
                  href="/login/line?auto=1"
                  className={`${lineLoginPinkPillClassName} lg:hidden`}
                >
                  <LineLoginPinkPillInner />
                </Link>
              ) : null}
            </div>

            {mainNav}

            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 lg:shrink-0 lg:justify-end">
              {heartsPill}
              {!memberUser ? (
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <Link href="/pages" className={iconBtnClass} aria-label="ค้นหา">
                    <IconSearch className="h-5 w-5" />
                  </Link>
                  {lineProfileImageUrl ? (
                    <Link
                      href={profileHref}
                      className={`${iconBtnClass} rounded-full`}
                      title={profileDisplayName || "โปรไฟล์"}
                      aria-label={profileDisplayName || "โปรไฟล์"}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={lineProfileImageUrl}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                        width={36}
                        height={36}
                        referrerPolicy="no-referrer"
                      />
                    </Link>
                  ) : (
                    <Link href={profileHref} className={iconBtnClass} aria-label="โปรไฟล์">
                      <IconUser className="h-5 w-5" />
                    </Link>
                  )}
                  <Link href="/cart" className={iconBtnClass} aria-label="ตะกร้า">
                    <IconCart className="h-5 w-5" />
                  </Link>
                </div>
              ) : null}
              {memberUser ? (
                <>
                  <div className="relative z-[1100]" ref={moreRef}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-pink-100 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-pink-200 hover:text-[#FF2E8C]"
                      aria-expanded={moreOpen}
                      aria-haspopup="true"
                      onClick={() => setMoreOpen((o) => !o)}
                    >
                      เพิ่มเติม
                      <span className="text-xs opacity-70" aria-hidden>
                        ▾
                      </span>
                    </button>
                    {moreOpen ? (
                      <ul
                        className="absolute right-0 z-[1100] mt-1 min-w-[14rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                        role="menu"
                      >
                        {renderMoreMenuItems()}
                        <li role="none" className="border-t border-gray-100">
                          <button
                            type="button"
                            role="menuitem"
                            className="block w-full px-3 py-2 text-left text-sm font-semibold text-neutral-800 hover:bg-gray-50"
                            onClick={() => {
                              setMoreOpen(false);
                              logout();
                            }}
                          >
                            ออกจากระบบ
                          </button>
                        </li>
                      </ul>
                    ) : null}
                  </div>
                </>
              ) : (
                <Link
                  href="/login/line?auto=1"
                  className={`${lineLoginPinkPillClassName} hidden lg:inline-flex`}
                >
                  <LineLoginPinkPillInner />
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* แถบแบรนด์ชมพู — แสดงเฉพาะเมื่อล็อกอินแล้ว (ผู้เยี่ยมไม่เห็นแถบนี้) */}
      {memberUser ? (
        <div
          className="flex h-20 w-full shrink-0 items-center bg-[#FF2E8C]"
          aria-label={pinkBarSuffix ? pinkBarSuffix : "HUAJAIY"}
        >
          <div className="mx-auto flex h-full w-full max-w-[1200px] min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
              <HeartIcon
                className="h-9 w-9 shrink-0 text-white sm:h-10 sm:w-10"
                aria-hidden
              />
              {pinkBarSuffix ? (
                <span className="min-w-0 truncate text-base font-semibold text-white sm:text-lg">
                  {pinkBarSuffix}
                </span>
              ) : (
                <span className="font-heading min-w-0 truncate text-lg font-bold uppercase tracking-tight text-white sm:text-xl">
                  HUAJAIY
                </span>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className={mainClassName}>{children}</div>

      <footer className="mt-auto border-t border-pink-100/90 bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-5 sm:py-3.5">
          <Link href="/" className="inline-flex shrink-0 items-center gap-1.5">
            <HeartIcon className="h-7 w-7 shrink-0 text-[#FF2E8C]" />
            <span className="font-heading text-base font-bold uppercase tracking-tight text-[#FF2E8C] sm:text-[1.05rem]">
              HUAJAIY
            </span>
          </Link>
          <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 sm:px-3">
            <nav
              className="flex max-w-full flex-wrap justify-center gap-x-1.5 text-[11px] leading-snug text-neutral-500 sm:gap-x-2 sm:text-xs"
              aria-label="ลิงก์กฎหมาย"
            >
              <Link href="/privacy" className="shrink-0 hover:text-[#FF2E8C] hover:underline">
                นโยบายความเป็นส่วนตัว
              </Link>
              <span aria-hidden className="text-neutral-400">
                ·
              </span>
              <Link href="/terms" className="shrink-0 hover:text-[#FF2E8C] hover:underline">
                ข้อกำหนดการให้บริการ
              </Link>
              <span aria-hidden className="text-neutral-400">
                ·
              </span>
              <Link href="/data-deletion" className="shrink-0 hover:text-[#FF2E8C] hover:underline">
                การลบข้อมูล
              </Link>
            </nav>
            <p className="text-center text-[11px] leading-snug text-neutral-500 sm:text-xs">
              © {new Date().getFullYear()} HUAJAIY สงวนลิขสิทธิ์ทั้งหมด
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#FF2E8C] to-[#f472b6] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm shadow-pink-400/20 transition hover:brightness-105 sm:px-5 sm:py-2 sm:text-sm"
          >
            ติดต่อเรา
          </Link>
        </div>
      </footer>
    </div>
  );
}
