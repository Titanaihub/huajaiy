"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { siteNavLinkClass } from "../lib/siteNavLinkClass";

const DEFAULT_AVATAR = "/tailadmin-template/images/default-member-avatar-heart.svg";

/**
 * เลย์เอาต์เพจสมาชิกแบบโซเชียล (คล้ายเพจ Facebook) — ใช้กับ /u/[username]
 * @param {{ member: Record<string, unknown> }} props
 */
export default function PublicMemberPageChrome({ member }) {
  const [tab, setTab] = useState("posts");
  const [copied, setCopied] = useState(false);

  const username = String(member?.username || "").trim();
  const displayName =
    String(member?.displayName || "").trim() || `@${username}`;

  const avatarSrc = useMemo(() => {
    const p = member?.profilePictureUrl;
    const l = member?.linePictureUrl;
    const a = (p && String(p).trim()) || (l && String(l).trim()) || "";
    return a || DEFAULT_AVATAR;
  }, [member]);

  const pageUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/u/${encodeURIComponent(username)}`;
  }, [username]);

  const copyLink = useCallback(async () => {
    if (!pageUrl) return;
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [pageUrl]);

  const socials = useMemo(() => {
    const rows = [];
    const fb = member?.socialFacebookUrl;
    const line = member?.socialLineUrl;
    const tt = member?.socialTiktokUrl;
    if (fb && String(fb).trim())
      rows.push({
        key: "fb",
        href: String(fb).trim(),
        label: "Facebook",
        className: "bg-[#1877F2] hover:bg-[#166FE5] text-white"
      });
    if (line && String(line).trim())
      rows.push({
        key: "line",
        href: String(line).trim(),
        label: "LINE",
        className: "bg-[#06C755] hover:bg-[#05b34c] text-white"
      });
    if (tt && String(tt).trim())
      rows.push({
        key: "tt",
        href: String(tt).trim(),
        label: "TikTok",
        className: "bg-slate-900 hover:bg-slate-800 text-white"
      });
    return rows;
  }, [member]);

  const tabBtn =
    "relative px-4 py-3 text-[15px] font-semibold transition-colors rounded-t-lg border-b-2 -mb-px min-h-[48px] flex items-center";

  return (
    <div className="min-h-dvh bg-[#f0f2f5]">
      <div className="mx-auto max-w-5xl px-0 pb-10 sm:px-4">
        <nav
          className="flex flex-wrap items-center gap-x-2 gap-y-2 px-4 py-3 text-sm sm:px-0"
          aria-label="ทางลัด"
        >
          <Link href="/" className={siteNavLinkClass}>
            ← หน้าแรก
          </Link>
          <span className="text-gray-400" aria-hidden>
            ·
          </span>
          <Link href="/game" className={siteNavLinkClass}>
            รายการเกม
          </Link>
        </nav>

        <div className="overflow-hidden rounded-none bg-white shadow-sm sm:rounded-xl">
          {/* ปกเพจ */}
          <div
            className="relative h-44 bg-gradient-to-br from-rose-500 via-pink-500 to-indigo-600 sm:h-52 md:h-60"
            aria-hidden
          >
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 80%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 45%)"
              }}
            />
          </div>

          <div className="relative px-4 pb-2 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
                <div className="-mt-16 shrink-0 sm:-mt-20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarSrc}
                    alt=""
                    width={168}
                    height={168}
                    className="h-28 w-28 rounded-full border-4 border-white bg-white object-cover shadow-md sm:h-36 sm:w-36 sm:border-[5px] md:h-40 md:w-40"
                  />
                </div>
                <div className="min-w-0 pb-1 sm:pb-2">
                  <h1 className="text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl md:text-[2rem]">
                    {displayName}
                  </h1>
                  <p className="mt-0.5 text-[15px] text-gray-600">@{username}</p>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-500">
                    เพจบน HUAJAIY — แชร์ลิงก์นี้ให้เพื่อนเข้ามาดูโปรไฟล์และเกมของคุณ
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pb-1 sm:justify-end">
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex items-center justify-center rounded-lg bg-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-300"
                >
                  {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์เพจ"}
                </button>
                <Link
                  href="/game"
                  className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
                >
                  ดูเกมในระบบ
                </Link>
              </div>
            </div>

            {/* แท็บคล้ายเพจ Facebook */}
            <div
              className="mt-4 flex gap-0 border-t border-gray-200"
              role="tablist"
              aria-label="ส่วนเพจ"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === "posts"}
                className={`${tabBtn} ${
                  tab === "posts"
                    ? "border-rose-600 text-rose-600"
                    : "border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
                onClick={() => setTab("posts")}
              >
                โพสต์
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "about"}
                className={`${tabBtn} ${
                  tab === "about"
                    ? "border-rose-600 text-rose-600"
                    : "border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
                onClick={() => setTab("about")}
              >
                เกี่ยวกับ
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100 bg-[#f0f2f5] px-3 py-4 sm:px-4 sm:py-6">
            {tab === "posts" ? (
              <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                <p className="text-lg font-semibold text-gray-800">
                  ยังไม่มีโพสต์
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  ในอนาคตคุณจะสามารถแชร์อัปเดตหรือกิจกรรมบนเพจนี้ได้
                </p>
              </div>
            ) : (
              <div className="mx-auto max-w-2xl space-y-4">
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="text-lg font-semibold text-gray-900">
                    ข้อมูลเพจ
                  </h2>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div>
                      <dt className="font-medium text-gray-500">ชื่อที่แสดง</dt>
                      <dd className="mt-0.5 text-gray-900">{displayName}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">ชื่อผู้ใช้</dt>
                      <dd className="mt-0.5 text-gray-900">@{username}</dd>
                    </div>
                  </dl>
                </section>
                {socials.length > 0 ? (
                  <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                      ช่องทางติดต่อ
                    </h2>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {socials.map((s) => (
                        <a
                          key={s.key}
                          href={s.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-semibold transition ${s.className}`}
                        >
                          {s.label}
                        </a>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
