"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import MemberPublicPostsFeed from "./MemberPublicPostsFeed";
import { publicMemberPath } from "../lib/memberPublicUrls";
import PublicMemberPageOwnerPanel from "./PublicMemberPageOwnerPanel";

const DEFAULT_AVATAR = "/tailadmin-template/images/default-member-avatar-heart.svg";

function trimUrl(v) {
  const s = String(v ?? "").trim();
  return s || "";
}

/** ไอคอนโซเชียลแถวแท็บ — เขียวเมื่อมีลิงก์ (จากโปรไฟล์) เทาเมื่อยังไม่กรอก */
function SocialTabIcon({ href, label, children }) {
  const active = Boolean(href);
  const base =
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition focus-visible:outline focus-visible:ring-2 focus-visible:ring-offset-1";
  const activeCls = `${base} bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-500`;
  const idleCls = `${base} cursor-default bg-gray-100 text-gray-400 focus-visible:ring-gray-300`;
  if (active) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        title={label}
        className={activeCls}
      >
        {children}
      </a>
    );
  }
  return (
    <span
      className={idleCls}
      aria-label={`${label} — ยังไม่ได้เพิ่มลิงก์`}
      title="สมาชิกยังไม่ได้เพิ่มลิงก์ในโปรไฟล์"
      role="img"
    >
      {children}
    </span>
  );
}

function IconLine({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path
        fill="currentColor"
        d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.07c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.137h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.63.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.269 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.086 9.436-6.975C23.176 14.393 24 12.458 24 10.314"
      />
    </svg>
  );
}

function IconFacebook({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path
        fill="currentColor"
        d="M24 12.073C24 5.446 18.627.073 12 .073S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.063 24 12.073z"
      />
    </svg>
  );
}

function IconTiktok({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path
        fill="currentColor"
        d="M12.525.02c1.31-.02 2.61-.01 3.918-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.01-1-.01-1.49V9.17c.07-1.33.57-2.63 1.41-3.72C4.67 3.52 8.31 2.35 11.82 2.3h.71z"
      />
    </svg>
  );
}

/**
 * เลย์เอาต์เพจสมาชิกแบบโซเชียล (คล้ายเพจ Facebook) — ใช้กับ /[username]
 * @param {{ member: Record<string, unknown>; initialPosts?: unknown[] }} props
 */
export default function PublicMemberPageChrome({ member, initialPosts = [] }) {
  const [tab, setTab] = useState("posts");
  const [copied, setCopied] = useState(false);

  const username = String(member?.username || "").trim();
  const legalDisplayName =
    String(member?.displayName || "").trim() || `@${username}`;
  const pageHeadline =
    String(member?.publicPageTitle || "").trim() || legalDisplayName;

  const avatarSrc = useMemo(() => {
    const p = member?.profilePictureUrl;
    const l = member?.linePictureUrl;
    const a = (p && String(p).trim()) || (l && String(l).trim()) || "";
    return a || DEFAULT_AVATAR;
  }, [member]);

  const coverUrl = String(member?.publicPageCoverUrl || "").trim();
  const bioCustom = String(member?.publicPageBio || "").trim();
  const tagline =
    bioCustom ||
    "เพจบน HUAJAIY — แชร์ลิงก์นี้ให้เพื่อนเข้ามาดูโปรไฟล์และเกมของคุณ";

  const pageUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${publicMemberPath(username)}`;
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

  /** ลิงก์โซเชียลจากโปรไฟล์ — ใช้ทุกเพจสมาชิก */
  const socialSlots = useMemo(() => {
    return [
      {
        key: "line",
        label: "LINE",
        href: trimUrl(member?.socialLineUrl)
      },
      {
        key: "facebook",
        label: "Facebook",
        href: trimUrl(member?.socialFacebookUrl)
      },
      {
        key: "tiktok",
        label: "TikTok",
        href: trimUrl(member?.socialTiktokUrl)
      }
    ];
  }, [member]);

  const tabBtn =
    "relative px-4 py-3 text-[15px] font-semibold transition-colors rounded-t-lg border-b-2 -mb-px min-h-[48px] flex items-center";

  return (
    <div className="min-h-full bg-[#f0f2f5] px-3 py-4 sm:px-5 sm:py-6 md:px-6">
      <div className="mx-auto max-w-4xl pb-6">
        <PublicMemberPageOwnerPanel username={username} member={member} />
        <div className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
          {/* ปกเพจ */}
          <div
            className={`relative h-44 overflow-hidden sm:h-52 md:h-60 ${
              coverUrl ? "bg-slate-900" : "bg-gradient-to-br from-rose-500 via-pink-500 to-indigo-600"
            }`}
            aria-hidden
          >
            {coverUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              </>
            ) : (
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 80%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 45%)"
                }}
              />
            )}
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
                    {pageHeadline}
                  </h1>
                  <p className="mt-0.5 text-[15px] text-gray-600">@{username}</p>
                  <p className="mt-2 max-w-xl whitespace-pre-wrap text-sm leading-relaxed text-gray-500">
                    {tagline}
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
                  href={`/game?creator=${encodeURIComponent(username)}`}
                  className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
                >
                  เกมของเพจ
                </Link>
              </div>
            </div>

            {/* แท็บ + ไอคอนโซเชียล (สีเขียว = มีลิงก์ในโปรไฟล์, เทา = ยังไม่กรอก) */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200">
              <div className="flex min-w-0 gap-0" role="tablist" aria-label="ส่วนเพจ">
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
              <div
                className="flex shrink-0 items-center gap-2 sm:gap-2.5"
                aria-label="โซเชียลจากโปรไฟล์"
              >
                {socialSlots.map((s) => (
                  <SocialTabIcon key={s.key} href={s.href} label={s.label}>
                    {s.key === "line" ? (
                      <IconLine className="h-5 w-5" />
                    ) : s.key === "facebook" ? (
                      <IconFacebook className="h-5 w-5" />
                    ) : (
                      <IconTiktok className="h-5 w-5" />
                    )}
                  </SocialTabIcon>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 bg-[#f0f2f5] px-3 py-4 sm:px-4 sm:py-6">
            {tab === "posts" ? (
              <div className="mx-auto max-w-4xl">
                <MemberPublicPostsFeed username={username} initialPosts={initialPosts} />
              </div>
            ) : (
              <div className="mx-auto max-w-2xl space-y-4">
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="text-lg font-semibold text-gray-900">
                    ข้อมูลเพจ
                  </h2>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div>
                      <dt className="font-medium text-gray-500">ชื่อเพจ (บนหัว)</dt>
                      <dd className="mt-0.5 text-gray-900">{pageHeadline}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">ชื่อ–นามสกุลในบัญชี</dt>
                      <dd className="mt-0.5 text-gray-900">{legalDisplayName}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">ชื่อผู้ใช้</dt>
                      <dd className="mt-0.5 text-gray-900">@{username}</dd>
                    </div>
                  </dl>
                </section>
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="text-lg font-semibold text-gray-900">ช่องทางติดต่อ</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    ไอคอนสีเขียวด้านบนลิงก์ไปยัง URL ที่ตั้งในโปรไฟล์ — แก้ไขได้ที่เมนูสมาชิก → โปรไฟล์
                  </p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {socialSlots.map((s) => (
                      <li key={s.key} className="flex flex-wrap items-baseline gap-2">
                        <span className="w-24 shrink-0 font-medium text-gray-600">{s.label}</span>
                        {s.href ? (
                          <a
                            href={s.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all text-emerald-700 underline decoration-emerald-600/40 hover:text-emerald-800"
                          >
                            {s.href}
                          </a>
                        ) : (
                          <span className="text-gray-400">ยังไม่ได้เพิ่มลิงก์</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
