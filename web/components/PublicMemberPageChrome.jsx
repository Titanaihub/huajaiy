"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import MemberPublicPostsFeed from "./MemberPublicPostsFeed";
import {
  BrandFacebookGlyph,
  BrandLineWordmark,
  BrandTiktokGlyph
} from "./MemberSocialBrandMarks";
import { publicMemberPath } from "../lib/memberPublicUrls";
import PublicMemberPageOwnerPanel from "./PublicMemberPageOwnerPanel";

const DEFAULT_AVATAR = "/tailadmin-template/images/default-member-avatar-heart.svg";

function trimUrl(v) {
  const s = String(v ?? "").trim();
  return s || "";
}

const SOCIAL_BTN =
  "inline-flex shrink-0 items-center justify-center shadow-md ring-1 ring-black/10 transition focus-visible:outline focus-visible:ring-2 focus-visible:ring-offset-1";

/** ปุ่มโลโก้แบรนด์เต็มสีทั้งกรณีมีลิงก์และยังไม่ตั้ง (ไม่จาง/ไม่ grayscale) */
function SocialTabIcon({ href, label, platform, children }) {
  const active = Boolean(href);
  const brandClsByPlatform = {
    /* รูป line.png มีพื้นเขียวในตัว — ไม่ล้อมพื้นเขียวซ้ำ */
    line: `${SOCIAL_BTN} h-11 min-w-[4.75rem] overflow-hidden rounded-lg bg-transparent p-0 shadow-none ring-0 hover:opacity-90 focus-visible:ring-[#06C755]/50`,
    facebook: `${SOCIAL_BTN} h-11 w-11 rounded-xl bg-white p-1.5 hover:bg-gray-50 focus-visible:ring-[#1877F2]/55`,
    tiktok: `${SOCIAL_BTN} h-11 w-11 rounded-xl bg-black p-1.5 hover:bg-neutral-900 focus-visible:ring-neutral-700`
  };
  const cls = brandClsByPlatform[platform] || brandClsByPlatform.line;
  if (active) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        title={label}
        className={cls}
      >
        {children}
      </a>
    );
  }
  return (
    <span
      className={`${cls} cursor-default`}
      aria-label={`${label} — ยังไม่ได้ตั้งลิงก์`}
      title="ยังไม่ได้ตั้งลิงก์ — เจ้าของเพจตั้งได้ที่แผง「แก้ไขเพจของฉัน」หรือเมนูสมาชิก → โปรไฟล์"
      role="img"
    >
      {children}
    </span>
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
        platform: "line",
        label: "LINE",
        href: trimUrl(member?.socialLineUrl),
        linkClass:
          "break-all text-[#06C755] underline decoration-[#06C755]/35 hover:text-[#05b64c]"
      },
      {
        key: "facebook",
        platform: "facebook",
        label: "Facebook",
        href: trimUrl(member?.socialFacebookUrl),
        linkClass:
          "break-all text-[#1877F2] underline decoration-[#1877F2]/35 hover:text-[#166fe5]"
      },
      {
        key: "tiktok",
        platform: "tiktok",
        label: "TikTok",
        href: trimUrl(member?.socialTiktokUrl),
        linkClass: "break-all text-gray-900 underline decoration-gray-400 hover:text-black"
      }
    ];
  }, [member]);

  const tabBtn =
    "relative px-4 py-3 text-[15px] font-semibold transition-colors rounded-t-lg border-b-2 -mb-px min-h-[48px] flex items-center";

  return (
    <div className="mx-auto min-h-full w-full max-w-[1200px] px-3 py-6 sm:px-5 sm:py-8">
      <div className="mx-auto max-w-4xl pb-6">
        <PublicMemberPageOwnerPanel username={username} member={member} />
        <div className="overflow-hidden rounded-2xl border border-pink-200/70 bg-white/95 shadow-sm shadow-pink-100/30">
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
                  <div
                    className="mt-3 flex flex-wrap items-center gap-2 sm:gap-2.5"
                    aria-label="โซเชียลจากโปรไฟล์"
                  >
                    {socialSlots.map((s) => (
                      <SocialTabIcon
                        key={`hero-${s.key}`}
                        href={s.href}
                        label={s.label}
                        platform={s.platform}
                      >
                        {s.key === "line" ? (
                          <BrandLineWordmark />
                        ) : s.key === "facebook" ? (
                          <BrandFacebookGlyph />
                        ) : (
                          <BrandTiktokGlyph />
                        )}
                      </SocialTabIcon>
                    ))}
                  </div>
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

            {/* แท็บ + ไอคอนโซเชียล (โลโก้แบรนด์เต็มสี — ยังไม่ตั้งลิงก์ก็แสดงสีเดิม) */}
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
                  <SocialTabIcon
                    key={s.key}
                    href={s.href}
                    label={s.label}
                    platform={s.platform}
                  >
                    {s.key === "line" ? (
                      <BrandLineWordmark />
                    ) : s.key === "facebook" ? (
                      <BrandFacebookGlyph />
                    ) : (
                      <BrandTiktokGlyph />
                    )}
                  </SocialTabIcon>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-pink-100/80 bg-pink-50/40 px-3 py-4 sm:px-4 sm:py-6">
            {tab === "posts" ? (
              <div className="mx-auto max-w-4xl">
                <MemberPublicPostsFeed
                  username={username}
                  initialPosts={initialPosts}
                  shareRewardHeartTint={
                    member && typeof member === "object" && member.publicPageHeartAccent
                      ? String(member.publicPageHeartAccent)
                      : null
                  }
                />
              </div>
            ) : (
              <div className="mx-auto max-w-2xl space-y-4">
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="text-lg font-semibold text-gray-900">
                    ข้อมูลเพจ
                  </h2>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div>
                      <dt className="font-medium text-gray-500">ชื่อผู้ใช้</dt>
                      <dd className="mt-0.5 text-gray-900">@{username}</dd>
                    </div>
                  </dl>
                </section>
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="text-lg font-semibold text-gray-900">ช่องทางติดต่อ</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    ไอคอนด้านบนเป็นโลโก้สีตามแบรนด์ — ตั้งลิงก์ได้ที่แผง「แก้ไขเพจของฉัน」หรือเมนูสมาชิก → โปรไฟล์
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
                            className={s.linkClass}
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
