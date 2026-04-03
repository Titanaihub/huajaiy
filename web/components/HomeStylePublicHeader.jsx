"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import BrandLogo from "./BrandLogo";
import { GLOBAL_PRIMARY_NAV } from "../lib/globalPrimaryNav";

const iconWrap =
  "inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 transition hover:bg-gray-100";

/**
 * แถบบนแบบหน้าแรก (Organic): โลโก้หัวใจ + HUAJAIY, เมนูไทย, รูป LINE มุมขวาบน
 * ใช้บนหน้าสมาชิก (เหนือ iframe TailAdmin)
 *
 * @param {string} [lineProfileImageUrl] — รูปจาก LINE (`user.linePictureUrl`) มุมขวาบน
 * @param {string} [profileDisplayName] — ชื่อสำหรับ alt ของรูป
 */
export default function HomeStylePublicHeader({
  onHamburgerClick,
  lineProfileImageUrl,
  profileDisplayName
}) {
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

  return (
    <header className="sticky top-0 z-[200] shrink-0 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex w-full max-w-[100%] flex-wrap items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <BrandLogo variant="header" layout="stacked" />
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
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
        </div>

        <nav
          className="order-last flex w-full flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-semibold text-gray-900 sm:order-none sm:w-auto sm:flex-1 sm:justify-end lg:gap-x-8"
          aria-label="เมนูหลัก"
        >
          {GLOBAL_PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md px-0.5 py-1 hover:text-rose-600"
            >
              {item.label}
            </Link>
          ))}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-0.5 py-1 hover:text-rose-600"
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
                className="absolute right-0 z-[220] mt-1 min-w-[13rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                role="menu"
              >
                <li>
                  <Link
                    href="/member"
                    className="block px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                  >
                    บัญชีสมาชิก
                  </Link>
                </li>
                <li>
                  <Link
                    href="/account"
                    className="block px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                  >
                    ภาพรวมบัญชี
                  </Link>
                </li>
                <li>
                  <Link
                    href="/register"
                    className="block px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                  >
                    สมัครสมาชิก
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="block px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                  >
                    ติดต่อ
                  </Link>
                </li>
              </ul>
            ) : null}
          </div>
        </nav>

        <div className="flex items-center gap-0.5 sm:gap-1">
          {!lineProfileImageUrl ? (
            <Link
              href="/login"
              className={iconWrap}
              title="เข้าสู่ระบบ"
              aria-label="เข้าสู่ระบบ"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden
              >
                <circle cx="12" cy="9" r="3" />
                <circle cx="12" cy="12" r="10" />
                <path
                  strokeLinecap="round"
                  d="M17.97 20c-.16-2.892-1.045-5-5.97-5s-5.81 2.108-5.97 5"
                />
              </svg>
            </Link>
          ) : null}
          <button
            type="button"
            className={iconWrap}
            title="รายการโปรด (เร็วๆ นี้)"
            aria-label="รายการโปรด"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden
            >
              <path d="M21 16.09v-4.992c0-4.29 0-6.433-1.318-7.766C18.364 2 16.242 2 12 2 7.757 2 5.636 2 4.318 3.332 3 4.665 3 6.81 3 11.098v4.993c0 3.096 0 4.645.734 5.321.35.323.792.526 1.263.58.987.113 2.14-.907 4.445-2.946 1.02-.901 1.529-1.352 2.118-1.47.29-.06.59-.06.88 0 .59.118 1.099.569 2.118 1.47 2.305 2.039 3.458 3.059 4.445 2.945.47-.053.913-.256 1.263-.579.734-.676.734-2.224.734-5.321Z" />
            </svg>
          </button>
          <Link href="/cart" className={iconWrap} title="ตะกร้า" aria-label="ตะกร้า">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden
            >
              <path d="M3.864 16.455c-.858-3.432-1.287-5.147-.386-6.301C4.378 9 6.148 9 9.685 9h4.63c3.538 0 5.306 0 6.207 1.154.901 1.153.472 2.87-.386 6.301-.546 2.183-.818 3.274-1.632 3.91-.814.635-1.939.635-4.189.635h-4.63c-2.25 0-3.375 0-4.189-.635-.814-.636-1.087-1.727-1.632-3.91Z" />
              <path d="m19.5 9.5-.71-2.605c-.274-1.005-.411-1.507-.692-1.886A2.5 2.5 0 0 0 17 4.172C16.56 4 16.04 4 15 4M4.5 9.5l.71-2.605c.274-1.005.411-1.507.692-1.886A2.5 2.5 0 0 1 7 4.172C7.44 4 7.96 4 9 4" />
              <path d="M9 4a1 1 0 0 1 1-1h4a1 1 0 1 1 0 2h-4a1 1 0 0 1-1-1Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 13v4m8-4v4m-4-4v4" />
            </svg>
          </Link>
          {lineProfileImageUrl ? (
            <Link
              href="/member"
              className="ml-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-2 ring-gray-100 transition hover:ring-rose-200"
              title={profileDisplayName || "บัญชีสมาชิก"}
              aria-label={profileDisplayName || "โปรไฟล์ LINE"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lineProfileImageUrl}
                alt={profileDisplayName || "โปรไฟล์ LINE"}
                className="h-10 w-10 rounded-full object-cover"
                width={40}
                height={40}
                referrerPolicy="no-referrer"
              />
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
