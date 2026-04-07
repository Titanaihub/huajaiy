"use client";

import Link from "next/link";

/**
 * หน้าแรกหลังเข้า `/member` — โปรไฟล์สไตล์ Figma (ปก + สถิติ + กล่องโพสต์)
 * ข้อมูลจาก user (publicPage*) + รูปโปรไฟล์/LINE
 */
export default function MemberHomeProfileLanding({ user }) {
  const displayTitle = (() => {
    const t = String(user?.publicPageTitle || "").trim();
    if (t) return t;
    const n = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
    if (n) return n;
    return user?.username ? `@${user.username}` : "สมาชิก";
  })();

  const bio =
    String(user?.publicPageBio || "").trim() ||
    "แก้ไขโปรไฟล์เพื่อเพิ่มแนะนำตัว — แชร์เรื่องราวและติดตามชุมชนได้ที่เพจ";

  const coverUrl = String(user?.publicPageCoverUrl || "").trim();
  const avatarUrl =
    String(user?.profilePictureUrl || "").trim() ||
    String(user?.linePictureUrl || "").trim();

  const profileHref = "/member/profile";

  return (
    <div className="border-b border-pink-100 bg-white">
      {/* ปก + โปรไฟล์ */}
      <div className="relative mx-auto max-w-[960px] px-3 pb-8 pt-2 sm:px-5">
        <div
          className="relative h-36 overflow-hidden rounded-2xl sm:h-44 md:h-52"
          style={
            coverUrl
              ? undefined
              : {
                  background:
                    "linear-gradient(90deg, #ec4899 0%, #d946ef 45%, #7c3aed 100%)"
                }
          }
        >
          {coverUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={coverUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>

        <div className="relative -mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between md:-mt-16">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:gap-5">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-neutral-200 shadow-md sm:h-28 sm:w-28 md:h-32 md:w-32">
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-neutral-400"
                  aria-hidden
                >
                  <svg className="h-14 w-14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="min-w-0 pb-0.5">
              <h1 className="truncate text-xl font-bold text-neutral-900 sm:text-2xl">
                {displayTitle}
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-neutral-600 sm:text-base">
                {bio}
              </p>
            </div>
          </div>
          <Link
            href={profileHref}
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full border border-pink-200 bg-white px-4 py-2 text-sm font-semibold text-[#FF2E8C] shadow-sm transition hover:border-pink-300 hover:bg-pink-50 sm:self-auto"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            แก้ไขโปรไฟล์
          </Link>
        </div>
      </div>

      {/* การ์ดสถิติ — ตัวเลขจะต่อ API ได้ภายหลัง */}
      <div className="mx-auto grid max-w-[960px] gap-3 px-3 pb-6 sm:grid-cols-3 sm:gap-4 sm:px-5">
        <div className="flex items-center gap-3 rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 to-white px-4 py-4 shadow-sm">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-100 text-xl" aria-hidden>
            🏆
          </span>
          <div>
            <p className="text-2xl font-bold tabular-nums text-neutral-900">0</p>
            <p className="text-sm font-medium text-neutral-600">เกมที่เล่น</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 to-white px-4 py-4 shadow-sm">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-100 text-xl" aria-hidden>
            🛍️
          </span>
          <div>
            <p className="text-2xl font-bold tabular-nums text-neutral-900">0</p>
            <p className="text-sm font-medium text-neutral-600">ไอเทมที่ซื้อ</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 to-white px-4 py-4 shadow-sm">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-100 text-xl" aria-hidden>
            💬
          </span>
          <div>
            <p className="text-2xl font-bold tabular-nums text-neutral-900">0</p>
            <p className="text-sm font-medium text-neutral-600">โพสต์</p>
          </div>
        </div>
      </div>

      {/* กล่องสร้างโพสต์ — ลิงก์ไปเพจชุมชน */}
      <div className="mx-auto max-w-[960px] px-3 pb-10 sm:px-5">
        <div className="rounded-2xl border border-pink-100 bg-white p-4 shadow-md shadow-pink-100/40 sm:p-5">
          <div className="flex gap-3">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-neutral-200">
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-neutral-400" aria-hidden>
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor="member-home-post-placeholder" className="sr-only">
                สร้างโพสต์
              </label>
              <textarea
                id="member-home-post-placeholder"
                readOnly
                rows={2}
                placeholder="คุณกำลังคิดอะไรอยู่?"
                className="w-full resize-none rounded-xl border border-pink-100 bg-pink-50/30 px-3 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-pink-50 pt-4">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/page#community-lobby"
                className="inline-flex items-center gap-1.5 rounded-full border border-pink-100 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-pink-50 sm:text-sm"
              >
                <span aria-hidden>🖼️</span>
                รูปภาพ
              </Link>
              <Link
                href="/page#community-lobby"
                className="inline-flex items-center gap-1.5 rounded-full border border-pink-100 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-pink-50 sm:text-sm"
              >
                <span aria-hidden>🔗</span>
                แนบลิงก์
              </Link>
            </div>
            <Link
              href="/page#community-lobby"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FF2E8C] to-[#f472b6] px-5 py-2 text-sm font-bold text-white shadow-md shadow-pink-400/25 transition hover:brightness-105"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              โพสต์
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
