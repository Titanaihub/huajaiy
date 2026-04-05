"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getApiBase } from "../lib/config";
import { getMemberToken } from "../lib/memberApi";
import {
  buildMemberPostShareUrl,
  facebookShareUrl,
  lineShareUrl
} from "../lib/memberPostShare";
import { useMemberAuth } from "./MemberAuthProvider";
import { PostBodyBlocks, needsExpand } from "./MemberPublicPostBlocks";

/**
 * @param {{ username: string; post: Record<string, unknown>; refUsername?: string }} props
 */
export default function MemberPublicSinglePostClient({ username, post, refUsername = "" }) {
  const { user } = useMemberAuth();
  const [expanded, setExpanded] = useState(true);
  const [origin, setOrigin] = useState("");
  const ref = String(refUsername || "").trim();

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  useEffect(() => {
    if (!ref || !post?.id || !username) return;
    const key = `huajaiy_ref_hit_${post.id}_${ref}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      return;
    }
    const base = getApiBase().replace(/\/$/, "");
    fetch(
      `${base}/api/public/members/${encodeURIComponent(username)}/posts/${encodeURIComponent(String(post.id))}/ref-click`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refUsername: ref })
      }
    )
      .catch(() => {})
      .finally(() => {
        try {
          sessionStorage.setItem(key, "1");
        } catch {
          /* ignore */
        }
      });
  }, [username, post?.id, ref]);

  const layout = post.layout === "stack" ? "stack" : "row";
  const cover = String(post.coverImageUrl || "").trim();
  const title = String(post.title || "").trim();
  const showExpand = needsExpand(post.bodyBlocks);

  const viewerUsername = user?.username ? String(user.username).trim() : "";

  const shareUrl = useMemo(() => {
    if (!origin) return "";
    return buildMemberPostShareUrl(origin, username, String(post.id), viewerUsername || null);
  }, [origin, username, post.id, viewerUsername]);

  const trackIntent = (channel) => {
    const token = getMemberToken();
    if (!token || !post?.id) return;
    const base = getApiBase().replace(/\/$/, "");
    fetch(`${base}/api/auth/my-public-posts/${encodeURIComponent(String(post.id))}/share-intent`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ channel })
    }).catch(() => {});
  };

  const onCopyLink = async () => {
    if (!shareUrl) return;
    trackIntent("copy");
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      /* ignore */
    }
  };

  const media = cover ? (
    <div
      className={
        layout === "stack"
          ? "aspect-[16/10] w-full overflow-hidden bg-gray-100"
          : "h-44 w-full shrink-0 overflow-hidden bg-gray-100 md:min-h-[12rem] md:w-2/5 md:max-w-md"
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cover} alt="" className="h-full w-full object-cover" />
    </div>
  ) : null;

  const shareRow = shareUrl ? (
    <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4">
      <p className="text-xs font-medium text-gray-600">แชร์โพสต์นี้</p>
      <div className="flex flex-wrap gap-2">
        <a
          href={lineShareUrl(shareUrl)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackIntent("line")}
          className="inline-flex items-center rounded-lg bg-[#06C755] px-3 py-2 text-xs font-semibold text-white hover:opacity-95"
        >
          แชร์ LINE
        </a>
        <a
          href={facebookShareUrl(shareUrl)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackIntent("facebook")}
          className="inline-flex items-center rounded-lg bg-[#1877F2] px-3 py-2 text-xs font-semibold text-white hover:opacity-95"
        >
          แชร์ Facebook
        </a>
        <button
          type="button"
          onClick={onCopyLink}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50"
        >
          คัดลอกลิงก์
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-gray-500">
        ถ้าล็อกอินสมาชิกแล้ว ลิงก์จะมี <code className="rounded bg-gray-100 px-1">?ref=ชื่อผู้ใช้</code>{" "}
        เพื่อนับจำนวนครั้งที่มีคนเปิดลิงก์ผ่านการแชร์ของแต่ละคน — การแชร์ต่อในแอปอื่นจะนับได้เมื่อลิงก์ยังมีพารามิเตอร์นี้
        (ไลน์และเฟสบุ๊กไม่ส่งข้อมูลกลับว่าใครกดแชร์จริง ระบบจะบันทึกเมื่อกดปุ่มแชร์จากเว็บนี้ขณะล็อกอิน)
      </p>
    </div>
  ) : null;

  return (
    <div className="min-h-full bg-[#f0f2f5] px-3 py-6 sm:px-5">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/u/${encodeURIComponent(username)}`}
          className="mb-4 inline-block text-sm font-semibold text-rose-600 hover:text-rose-800"
        >
          ← กลับไปเพจ @{username}
        </Link>
        <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div
            className={
              layout === "stack" || !cover ? "flex flex-col" : "flex flex-col md:flex-row"
            }
          >
            {media}
            <div className="min-w-0 flex-1 p-5">
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{title}</h1>
              {post.bodyBlocks && post.bodyBlocks.length > 0 ? (
                <div className="mt-4">
                  <PostBodyBlocks blocks={post.bodyBlocks} expanded={expanded} />
                  {showExpand ? (
                    <button
                      type="button"
                      onClick={() => setExpanded((e) => !e)}
                      className="mt-2 text-xs font-semibold text-rose-600 hover:text-rose-800"
                    >
                      {expanded ? "ย่อ" : "ขยาย"}
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-400">ไม่มีคำอธิบาย</p>
              )}
              {shareRow}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
