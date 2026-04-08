"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getApiBase } from "../lib/config";
import { publicMemberPath } from "../lib/memberPublicUrls";
import {
  apiPostShareIntent,
  apiPublicPostShareIntent,
  getMemberToken
} from "../lib/memberApi";
import {
  buildMemberPostShareUrl,
  facebookShareUrl,
  lineShareUrl
} from "../lib/memberPostShare";
import { useMemberAuth } from "./MemberAuthProvider";
import { PostBodyBlocks, needsExpand } from "./MemberPublicPostBlocks";
import ShareRewardVisitorBanner, {
  shareRewardBannerIncludesShareHeading
} from "./ShareRewardVisitorBanner";

/**
 * @param {{ username: string; post: Record<string, unknown>; refUsername?: string }} props
 */
export default function MemberPublicSinglePostClient({ username, post, refUsername = "" }) {
  const { user } = useMemberAuth();
  const [expanded, setExpanded] = useState(true);
  const [origin, setOrigin] = useState("");
  const [grantFlash, setGrantFlash] = useState("");
  const ref = String(refUsername || "").trim();

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  useEffect(() => {
    if (!grantFlash) return undefined;
    const t = setTimeout(() => setGrantFlash(""), 6000);
    return () => clearTimeout(t);
  }, [grantFlash]);

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
    if (!post?.id || !username) return;
    const token = getMemberToken();
    if (token) {
      apiPostShareIntent(token, String(post.id), channel)
        .then((data) => {
          if (data.shareReward?.granted && data.shareReward.redAmount != null) {
            setGrantFlash(
              `คุณได้รับหัวใจแดง ${data.shareReward.redAmount} ดวงจากการแชร์โพสต์นี้`
            );
          }
        })
        .catch(() => {});
    } else {
      apiPublicPostShareIntent(username, String(post.id), channel).catch(() => {});
    }
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
      <ShareRewardVisitorBanner
        shareReward={post.shareReward}
        heartTint={
          typeof post.shareRewardHeartTint === "string" ? post.shareRewardHeartTint : null
        }
        className="px-3 py-2"
      />
      {grantFlash ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-900">
          {grantFlash}
        </p>
      ) : null}
      {!shareRewardBannerIncludesShareHeading(post.shareReward) ? (
        <p className="text-xs font-medium text-gray-600">แชร์โพสต์นี้</p>
      ) : null}
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
    </div>
  ) : null;

  return (
    <div className="mx-auto min-h-full w-full max-w-[1200px] px-3 py-6 sm:px-5 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href={publicMemberPath(username)}
          className="mb-4 inline-block text-sm font-semibold text-[#FF2E8C] hover:text-rose-700"
        >
          ← กลับไปเพจ @{username}
        </Link>
        <article className="overflow-hidden rounded-2xl border border-pink-200/70 bg-white/95 shadow-sm shadow-pink-100/30">
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
