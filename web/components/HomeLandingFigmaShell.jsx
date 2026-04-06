"use client";

import Link from "next/link";
import BrandLogo from "./BrandLogo";
import HeartIcon from "./HeartIcon";
import { useMemberAuth } from "./MemberAuthProvider";

const HEART_PINK_SRC = "/hearts/pink-heart.png";
const HEART_RED_SRC = "/hearts/red-heart.png";

/**
 * หน้าแรก — โหมดจัดวาง/สีตามแม่แบบ Figma (เมนู + Hero)
 * ข้อมูลยอดหัวใจ / เมนูเกมจาก API / โปรไฟล์จริง ถอดชั่วคราว (แสดงตัวเลขตัวอย่าง)
 * TODO: คืน useHearts, NavGamesMenuItem, เมนูสมาชิก เมื่อพร้อมผูกข้อมูลจริง
 */
export default function HomeLandingFigmaShell({
  onHamburgerClick,
  lineProfileImageUrl: _lineProfileImageUrl,
  profileDisplayName: _profileDisplayName
}) {
  const { user: memberUser } = useMemberAuth();

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

  const navItem =
    "rounded-lg px-2.5 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-fuchsia-50 hover:text-fuchsia-700";

  return (
    <div className="shrink-0">
      {/* แถบโปรโมชันบน — ชมพูเข้ม */}
      <div className="bg-[#e91e8c] px-3 py-2 text-center text-xs font-medium text-white sm:text-sm">
        <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
          <span aria-hidden>💗</span>
          <span>ยินดีต้อนรับสู่ HUAJAIY — Game · Social Feed · Marketplace</span>
        </span>
      </div>

      <header className="sticky top-0 z-[1040] border-b border-pink-100 bg-white shadow-[0_1px_0_0_rgba(233,30,140,0.08)]">
        <div className="mx-auto max-w-[1200px] px-3 sm:px-5">
          {/* แถวบน: โลโก้ + หัวใจตัวอย่าง + ไอคอน + CTA */}
          <div className="flex flex-wrap items-center gap-3 border-b border-pink-50/90 py-3 sm:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
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
              <div className="min-w-0">
                <BrandLogo variant="header" tone="organic" />
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#c2186e] sm:text-[11px]">
                  Game Social Feed Marketplace
                </p>
              </div>
            </div>

            {/* ยอดหัวใจตัวอย่าง (ไม่ผูก API) */}
            <div
              className="flex items-center justify-center gap-3 rounded-2xl border border-pink-200 bg-gradient-to-r from-pink-50 to-fuchsia-50 px-3 py-2 sm:px-4"
              aria-label="ยอดหัวใจตัวอย่าง"
            >
              <span className="inline-flex items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={HEART_PINK_SRC} alt="" width={22} height={22} className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
                <span className="text-sm font-bold tabular-nums text-pink-600">0</span>
              </span>
              <span className="inline-flex items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={HEART_RED_SRC} alt="" width={22} height={22} className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
                <span className="text-sm font-bold tabular-nums text-red-600">0</span>
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
                <span className="text-sm font-bold tabular-nums text-red-800">0</span>
              </span>
            </div>

            <div className="flex w-full flex-none items-center justify-center gap-1 sm:ms-auto sm:w-auto sm:justify-end">
              <Link
                href="/page"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-800 hover:bg-fuchsia-50"
                title="ค้นหา"
                aria-label="ค้นหา"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" strokeLinecap="round" />
                </svg>
              </Link>
              <Link
                href="/login"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-800 hover:bg-fuchsia-50"
                title="โปรไฟล์"
                aria-label="โปรไฟล์"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="9" r="3" />
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" d="M17.97 20c-.16-2.892-1.045-5-5.97-5s-5.81 2.108-5.97 5" />
                </svg>
              </Link>
              <Link
                href="/cart"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-800 hover:bg-fuchsia-50"
                title="ตะกร้า"
                aria-label="ตะกร้า"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3.864 16.455c-.858-3.432-1.287-5.147-.386-6.301C4.378 9 6.148 9 9.685 9h4.63c3.538 0 5.306 0 6.207 1.154.901 1.153.472 2.87-.386 6.301-.546 2.183-.818 3.274-1.632 3.91-.814.635-1.939.635-4.189.635h-4.63c-2.25 0-3.375 0-4.189-.635-.814-.636-1.087-1.727-1.632-3.91Z" />
                  <path d="M19.5 9.5-.71-2.605c-.274-1.005-.411-1.507-.692-1.886A2.5 2.5 0 0 0 17 4.172C16.56 4 16.04 4 15 4M4.5 9.5l.71-2.605c.274-1.005.411-1.507.692-1.886A2.5 2.5 0 0 1 7 4.172C7.44 4 7.96 4 9 4" />
                </svg>
              </Link>
              <Link
                href="/login"
                className="ml-1 rounded-full bg-gradient-to-r from-[#e91e8c] to-[#f472b6] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-pink-400/30 transition hover:brightness-105"
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

          {/* แถวเมนูข้อความ — พื้นขาว ลิงก์ดำ โทนแบบภาพตัวอย่าง */}
          <nav
            className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 py-2.5 sm:justify-end sm:gap-x-0 sm:gap-y-0 sm:divide-x sm:divide-pink-100"
            aria-label="เมนูหลัก"
          >
            <Link href="/" className={`${navItem} sm:px-4 sm:pe-5`}>
              หน้าแรก
            </Link>
            <Link href="/page" className={`${navItem} sm:px-4 sm:ps-5 sm:pe-5`}>
              ร้านค้า
            </Link>
            <Link href="/game" className={`${navItem} sm:px-4 sm:ps-5 sm:pe-5`}>
              เกม
            </Link>
            <Link href="/page" className={`${navItem} sm:px-4 sm:ps-5 sm:pe-5`}>
              ฟีด
            </Link>
            <Link href="/page" className={`${navItem} sm:px-4 sm:ps-5`}>
              เพจ
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero — ไล่ชมพูเข้มไปม่วง */}
      <section
        className="relative overflow-hidden bg-gradient-to-br from-[#d946a6] via-[#c026d3] to-[#6d28d9]"
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
              <HeartIcon className="text-white drop-shadow-md" style={{ width: h.s, height: h.s }} />
            </span>
          ))}
        </div>
        <div className="relative mx-auto max-w-4xl px-4 py-14 text-center sm:py-20 md:py-24">
          <h1
            id="home-figma-hero-title"
            className="text-3xl font-bold leading-tight text-white drop-shadow sm:text-4xl md:text-5xl"
          >
            ยินดีต้อนรับสู่แพลตฟอร์มหัวใจ
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/95 sm:text-lg">
            เล่นเกม สะสมหัวใจ ช้อปในร้านค้า และติดตามฟีดชุมชน — ครบในที่เดียว
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/game"
              className="inline-flex min-h-[3rem] min-w-[10rem] items-center justify-center rounded-full bg-white px-6 py-3 text-base font-bold text-[#c026d3] shadow-lg transition hover:bg-pink-50"
            >
              เกมและรางวัล
            </Link>
            <Link
              href="/login/line"
              className="inline-flex min-h-[3rem] min-w-[10rem] items-center justify-center rounded-full border-2 border-white/50 bg-[#06C755] px-6 py-3 text-base font-bold text-white shadow-lg transition hover:bg-[#05b34c]"
            >
              สมัครผ่าน LINE
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
