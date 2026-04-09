"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { postUploadFormData } from "../lib/uploadClient";
import {
  apiCreateMyPublicPost,
  apiDeleteMyPublicPost,
  apiGetPostShareStats,
  apiMyPublicPosts,
  apiPatchMyPublicPost,
  apiPauseShareRewardCampaign,
  apiPostShareIntent,
  apiPublicPostShareIntent,
  apiStartShareRewardCampaign,
  getMemberToken
} from "../lib/memberApi";
import {
  buildMemberPostShareUrl,
  facebookShareUrl,
  lineShareUrl
} from "../lib/memberPostShare";
import { publicMemberPostPath } from "../lib/memberPublicUrls";
import { useMemberAuth } from "./MemberAuthProvider";
import { PostBodyBlocks, needsExpand } from "./MemberPublicPostBlocks";
import {
  BrandFacebookGlyph,
  BrandLineWordmark,
  BrandTiktokGlyph,
  SOCIAL_BRAND_ICON_WRAP_CLASS
} from "./MemberSocialBrandMarks";
import ShareRewardVisitorBanner from "./ShareRewardVisitorBanner";

function newClientId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function sortPosts(list) {
  const arr = Array.isArray(list) ? [...list] : [];
  arr.sort((a, b) => {
    const so = (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
    if (so !== 0) return so;
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });
  return arr;
}

function blocksToApi(blocks) {
  return (blocks || [])
    .map((b) => {
      if (!b || typeof b !== "object") return null;
      const t = String(b.type || "").toLowerCase();
      if (t === "paragraph") {
        const text = String(b.text ?? "").trim();
        if (!text) return null;
        return { type: "paragraph", text };
      }
      if (t === "image") {
        const url = String(b.url ?? "").trim();
        if (!/^https:\/\//i.test(url)) return null;
        return { type: "image", url };
      }
      if (t === "link") {
        const url = String(b.url ?? "").trim();
        const label = String(b.label ?? "").trim();
        if (!/^https:\/\//i.test(url)) return null;
        return { type: "link", url, label: label || url };
      }
      return null;
    })
    .filter(Boolean);
}

function blocksFromApi(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((b) => {
    const t = String(b?.type || "").toLowerCase();
    const base = { clientId: newClientId() };
    if (t === "paragraph") {
      return { ...base, type: "paragraph", text: String(b.text ?? "") };
    }
    if (t === "image") {
      return { ...base, type: "image", url: String(b.url ?? "") };
    }
    if (t === "link") {
      return {
        ...base,
        type: "link",
        url: String(b.url ?? ""),
        label: String(b.label ?? "")
      };
    }
    return { ...base, type: "paragraph", text: "" };
  });
}

function loadImage(fileBlob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(fileBlob);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => reject(new Error("อ่านรูปไม่ได้"));
    img.src = objectUrl;
  });
}

const JPEG_FLAT_BG = "#f8fafc";

async function compressToJpeg(file) {
  const img = await loadImage(file);
  const maxSide = 1920;
  const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = JPEG_FLAT_BG;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("บีบอัดไม่สำเร็จ"))),
      "image/jpeg",
      0.85
    );
  });
}

function isProbablyPng(file) {
  return (
    (file.type && String(file.type).toLowerCase() === "image/png") ||
    /\.png$/i.test(file.name || "")
  );
}

async function uploadPostImage(file) {
  const body = new FormData();
  if (isProbablyPng(file)) {
    body.append(
      "image",
      file,
      file.name && /\.png$/i.test(file.name) ? file.name : `upload-${Date.now()}.png`
    );
  } else {
    const blob = await compressToJpeg(file);
    body.append(
      "image",
      new File([blob], `${Date.now()}.jpg`, { type: "image/jpeg" })
    );
  }
  const data = await postUploadFormData(body);
  return data.publicUrl;
}

function channelLabel(ch) {
  if (ch === "line") return "LINE";
  if (ch === "facebook") return "Facebook";
  if (ch === "copy") return "คัดลอกลิงก์";
  return String(ch || "");
}

function MemberPublicPostCard({
  post,
  pageUsername,
  viewerUsername,
  isOwner,
  onEdit,
  onDelete,
  onPostUpdated,
  refreshMemberProfile,
  shareRewardHeartTint
}) {
  const [expanded, setExpanded] = useState(false);
  const [origin, setOrigin] = useState("");
  const [statsOpen, setStatsOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsErr, setStatsErr] = useState("");
  const [rewardPer, setRewardPer] = useState("5");
  const [rewardBudget, setRewardBudget] = useState("500");
  const [rewardBusy, setRewardBusy] = useState(false);
  const [rewardErr, setRewardErr] = useState("");
  const [grantFlash, setGrantFlash] = useState("");

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  useEffect(() => {
    const sr = post?.shareReward;
    if (sr && typeof sr === "object") {
      if (sr.redPerMember != null) setRewardPer(String(sr.redPerMember));
      if (sr.initialBudget != null) setRewardBudget(String(sr.initialBudget));
    }
    setRewardErr("");
  }, [post?.id, post?.shareReward?.redPerMember, post?.shareReward?.initialBudget]);

  useEffect(() => {
    if (!grantFlash) return undefined;
    const t = setTimeout(() => setGrantFlash(""), 6000);
    return () => clearTimeout(t);
  }, [grantFlash]);

  const layout = post.layout === "stack" ? "stack" : "row";
  const cover = String(post.coverImageUrl || "").trim();
  const title = String(post.title || "").trim();
  const showExpand = needsExpand(post.bodyBlocks);

  /** รายการสาธารณะไม่ส่ง canStart/canPause — คำนวณจาก status ให้เจ้าของเพจ */
  const sr = post.shareReward;
  const ownerCanPause = Boolean(isOwner && sr && sr.status === "active");
  const ownerCanStart = Boolean(isOwner && sr && sr.status !== "active");

  const vu = viewerUsername ? String(viewerUsername).trim() : "";
  const shareUrl = useMemo(() => {
    if (!origin || !pageUsername || !post?.id) return "";
    return buildMemberPostShareUrl(origin, pageUsername, String(post.id), vu || null);
  }, [origin, pageUsername, post.id, vu]);

  const trackIntent = useCallback(
    async (channel) => {
      if (!post?.id || !pageUsername) return;
      try {
        const token = getMemberToken();
        if (token) {
          const data = await apiPostShareIntent(token, String(post.id), channel);
          if (data.shareReward?.granted && data.shareReward.redAmount != null) {
            setGrantFlash(
              `คุณได้รับหัวใจแดง ${data.shareReward.redAmount} ดวงจากการแชร์โพสต์นี้`
            );
          }
        } else {
          await apiPublicPostShareIntent(pageUsername, String(post.id), channel);
        }
      } catch {
        /* ignore */
      }
    },
    [pageUsername, post?.id]
  );

  const startShareReward = useCallback(async () => {
    if (!isOwner || !post?.id || !onPostUpdated) return;
    const token = getMemberToken();
    if (!token) return;
    const per = Math.max(0, Math.floor(Number(rewardPer) || 0));
    const budget = Math.max(0, Math.floor(Number(rewardBudget) || 0));
    setRewardBusy(true);
    setRewardErr("");
    try {
      const { post: updated } = await apiStartShareRewardCampaign(token, String(post.id), {
        redPerMember: per,
        redBudget: budget
      });
      if (updated) onPostUpdated(updated);
      try {
        await refreshMemberProfile?.();
      } catch {
        /* ignore */
      }
    } catch (e) {
      setRewardErr(e instanceof Error ? e.message : String(e));
    } finally {
      setRewardBusy(false);
    }
  }, [isOwner, onPostUpdated, post?.id, refreshMemberProfile, rewardBudget, rewardPer]);

  const pauseShareReward = useCallback(async () => {
    if (!isOwner || !post?.id || !onPostUpdated) return;
    const token = getMemberToken();
    if (!token) return;
    if (!window.confirm("ระงับการแจกหัวใจและคืนวงเงินที่เหลือให้คุณ?")) return;
    setRewardBusy(true);
    setRewardErr("");
    try {
      const { post: updated } = await apiPauseShareRewardCampaign(token, String(post.id));
      if (updated) onPostUpdated(updated);
      try {
        await refreshMemberProfile?.();
      } catch {
        /* ignore */
      }
    } catch (e) {
      setRewardErr(e instanceof Error ? e.message : String(e));
    } finally {
      setRewardBusy(false);
    }
  }, [isOwner, onPostUpdated, post?.id, refreshMemberProfile]);

  const loadStats = useCallback(async () => {
    const token = getMemberToken();
    if (!token || !post?.id) return;
    setStatsLoading(true);
    setStatsErr("");
    try {
      const data = await apiGetPostShareStats(token, String(post.id));
      setStats({
        intents: data.intents || [],
        refClicksByUser: data.refClicksByUser || [],
        totalRefClicks: data.totalRefClicks ?? 0,
        shareIntentTotal: data.shareIntentTotal ?? 0,
        shareIntentAnonymous: data.shareIntentAnonymous ?? 0,
        shareIntentIdentified: data.shareIntentIdentified ?? 0
      });
    } catch (e) {
      setStatsErr(e instanceof Error ? e.message : String(e));
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [post?.id]);

  const onCopyShareLink = useCallback(async () => {
    if (!shareUrl) return;
    await trackIntent("copy");
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      /* ignore */
    }
  }, [shareUrl, trackIntent]);

  const onTikTokShare = useCallback(async () => {
    if (!shareUrl) return;
    await trackIntent("tiktok");
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      /* ignore */
    }
  }, [shareUrl, trackIntent]);

  const toggleStats = useCallback(() => {
    setStatsOpen((o) => {
      const next = !o;
      if (next) loadStats();
      return next;
    });
  }, [loadStats]);

  const media = cover ? (
    <div
      className={
        layout === "stack"
          ? "aspect-[16/10] w-full overflow-hidden bg-gray-100"
          : "h-44 w-full shrink-0 overflow-hidden bg-gray-100 md:h-full md:min-h-[11rem] md:w-44 md:max-w-[44%]"
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cover} alt="" className="h-full w-full object-cover" />
    </div>
  ) : (
    <div
      className={
        layout === "stack"
          ? "flex aspect-[16/10] w-full items-center justify-center bg-gradient-to-br from-rose-100 to-indigo-100 text-gray-400"
          : "flex h-44 w-full shrink-0 items-center justify-center bg-gradient-to-br from-rose-100 to-indigo-100 text-gray-400 md:h-auto md:min-h-[11rem] md:w-44"
      }
    >
      <span className="text-xs font-medium">ไม่มีรูปหัวข้อ</span>
    </div>
  );

  const body = (
    <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-semibold leading-snug text-gray-900">{title}</h3>
        {isOwner ? (
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => onEdit(post)}
              className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-200"
            >
              แก้ไข
            </button>
            <button
              type="button"
              onClick={() => onDelete(post)}
              className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              ลบ
            </button>
          </div>
        ) : null}
      </div>
      {post.bodyBlocks && post.bodyBlocks.length > 0 ? (
        <>
          <PostBodyBlocks blocks={post.bodyBlocks} expanded={expanded} />
          {showExpand ? (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="self-start text-xs font-semibold text-rose-600 hover:text-rose-800"
            >
              {expanded ? "ย่อ" : "ขยาย"}
            </button>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-gray-400">ไม่มีคำอธิบาย</p>
      )}
      {isOwner ? (
        <p className="text-[11px] text-gray-400">
          ลำดับแสดง: {Number(post.sortOrder) || 0} ·{" "}
          {layout === "stack" ? "แบบซ้อน (2 การ์ด/แถว)" : "แบบแถว (1 การ์ด/แถว)"}
        </p>
      ) : null}
      <ShareRewardVisitorBanner
        shareReward={post.shareReward}
        heartTint={
          (typeof post.shareRewardHeartTint === "string" && post.shareRewardHeartTint) ||
          shareRewardHeartTint ||
          null
        }
        className="mt-2"
      />
      {grantFlash ? (
        <p className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] font-medium text-emerald-900">
          {grantFlash}
        </p>
      ) : null}
      {isOwner && post.shareReward ? (
        <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50/50 px-2.5 py-2">
          <p className="text-[11px] font-semibold text-gray-800">แจกหัวใจแดงเมื่อแชร์</p>
          <p className="mt-0.5 text-[10px] leading-snug text-gray-600">
            กันวงเงินจากหัวใจแดงกระเป๋า + หัวใจแดงสำหรับแจกของคุณ (หักจากแจกก่อน) ทันที — ผู้เยี่ยมชมที่แชร์จากเว็บและครบเงื่อนไขระบบจะได้หัวใจแดงตามที่ตั้ง
            (คนละครั้งต่อโพสต์)
          </p>
          {post.shareReward.status === "active" ? (
            <p className="mt-1.5 text-[11px] text-gray-700">
              วงเงินคงเหลือในมัดจำ:{" "}
              <strong>{post.shareReward.poolRemaining ?? 0}</strong> ดวง · จ่ายแล้ว{" "}
              <strong>{post.shareReward.recipientsCount ?? 0}</strong> คน
            </p>
          ) : null}
          {rewardErr ? (
            <p className="mt-1 text-[11px] text-red-600">{rewardErr}</p>
          ) : null}
          {ownerCanPause ? (
            <button
              type="button"
              disabled={rewardBusy}
              onClick={pauseShareReward}
              className="mt-2 rounded-md bg-gray-800 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-gray-900 disabled:opacity-50"
            >
              {rewardBusy ? "กำลังดำเนินการ…" : "ระงับการแจกหัวใจ (คืนวงเงินที่เหลือ)"}
            </button>
          ) : null}
          {ownerCanStart ? (
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
              <label className="flex flex-col text-[10px] font-medium text-gray-600">
                หัวใจแดงต่อ 1 คน (เมื่อครบเงื่อนไขระบบ)
                <input
                  type="number"
                  min={1}
                  className="mt-0.5 w-full max-w-[8rem] rounded border border-gray-200 px-2 py-1 text-sm sm:max-w-[10rem]"
                  value={rewardPer}
                  onChange={(e) => setRewardPer(e.target.value)}
                  disabled={rewardBusy}
                />
              </label>
              <label className="flex flex-col text-[10px] font-medium text-gray-600">
                วงเงินรวมสูงสุด (กันจากยอดคุณ)
                <input
                  type="number"
                  min={1}
                  className="mt-0.5 w-full max-w-[8rem] rounded border border-gray-200 px-2 py-1 text-sm sm:max-w-[10rem]"
                  value={rewardBudget}
                  onChange={(e) => setRewardBudget(e.target.value)}
                  disabled={rewardBusy}
                />
              </label>
              <button
                type="button"
                disabled={rewardBusy}
                onClick={startShareReward}
                className="rounded-md bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {rewardBusy ? "กำลังดำเนินการ…" : "เริ่มกันวงเงินและแจกรางวัล"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      {shareUrl ? (
        <div className="mt-2 border-t border-gray-100 pt-2">
          <p className="mb-1.5 text-[11px] font-medium text-gray-600">แชร์โพสต์</p>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={lineShareUrl(shareUrl)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackIntent("line")}
              className={SOCIAL_BRAND_ICON_WRAP_CLASS}
              aria-label="แชร์ LINE"
              title="LINE"
            >
              <BrandLineWordmark />
            </a>
            <a
              href={facebookShareUrl(shareUrl)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackIntent("facebook")}
              className={SOCIAL_BRAND_ICON_WRAP_CLASS}
              aria-label="แชร์ Facebook"
              title="Facebook"
            >
              <BrandFacebookGlyph />
            </a>
            <button
              type="button"
              onClick={onTikTokShare}
              className={SOCIAL_BRAND_ICON_WRAP_CLASS}
              aria-label="คัดลอกลิงก์เพื่อแชร์ TikTok"
              title="คัดลอกลิงก์ (แชร์ TikTok)"
            >
              <BrandTiktokGlyph />
            </button>
            <button
              type="button"
              onClick={onCopyShareLink}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-[11px] font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
            >
              คัดลอกลิงก์
            </button>
            <a
              href={publicMemberPostPath(pageUsername, String(post.id))}
              className="text-[11px] font-semibold text-rose-600 underline hover:text-rose-800"
            >
              เปิดหน้าโพสต์
            </a>
          </div>
        </div>
      ) : null}
      {isOwner ? (
        <div className="mt-2 border-t border-dashed border-gray-200 pt-2">
          <button
            type="button"
            onClick={toggleStats}
            className="text-[11px] font-semibold text-gray-700 underline decoration-gray-400 hover:text-gray-900"
          >
            {statsOpen ? "ซ่อนสถิติแชร์" : "ดูสถิติแชร์"}
          </button>
          {statsOpen ? (
            <div className="mt-2 space-y-2 text-[11px] text-gray-600">
              {statsLoading ? <p>กำลังโหลด…</p> : null}
              {statsErr ? <p className="text-red-600">{statsErr}</p> : null}
              {stats && !statsLoading ? (
                <>
                  <p className="rounded bg-gray-50 px-2 py-1.5 text-[11px] text-gray-700">
                    กดแชร์จากเว็บรวม <strong>{stats.shareIntentTotal}</strong> ครั้ง — ระบุสมาชิก{" "}
                    <strong>{stats.shareIntentIdentified}</strong> · ไม่ล็อกอิน{" "}
                    <strong>{stats.shareIntentAnonymous}</strong>
                  </p>
                  <p className="text-[10px] leading-snug text-amber-900/90">
                    มอบหัวใจรางวัล: สมาชิกที่ล็อกอินและกดแชร์จากปุ่มในหน้าเว็บจะได้รางวัลทันที (คนละครั้งต่อโพสต์) — แถว &quot;ผู้เยี่ยมชม&quot; ไม่ได้รางวัล
                  </p>
                  <div>
                    <p className="font-semibold text-gray-800">รายการกดแชร์จากเว็บ (ล่าสุด)</p>
                    {stats.intents.length === 0 ? (
                      <p className="text-gray-500">ยังไม่มีข้อมูล</p>
                    ) : (
                      <ul className="mt-1 max-h-32 list-inside list-disc space-y-0.5 overflow-y-auto text-gray-600">
                        {stats.intents.slice(0, 50).map((row, i) => (
                          <li key={i}>
                            {row.anonymous ? (
                              <span>{row.displayName}</span>
                            ) : (
                              <span>@{row.username}</span>
                            )}
                            <span>
                              {" "}
                              · {channelLabel(row.channel)} ·{" "}
                              {row.createdAt
                                ? new Date(row.createdAt).toLocaleString("th-TH")
                                : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">
                      การเปิดลิงก์ที่มี ref (รวม {stats.totalRefClicks} ครั้ง)
                    </p>
                    {stats.refClicksByUser.length === 0 ? (
                      <p className="text-gray-500">ยังไม่มีคลิกจากลิงก์อ้างอิง</p>
                    ) : (
                      <ul className="mt-1 space-y-0.5">
                        {stats.refClicksByUser.map((row, i) => (
                          <li key={i}>
                            @{row.username} ({row.displayName}) — {row.clickCount} ครั้ง
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <p className="text-[10px] leading-snug text-gray-500">
                    ไลน์/เฟสบุ๊กไม่แจ้งว่า &quot;ใคร&quot; แชร์จริง — ระบบจึงยึดการกดปุ่มแชร์บนเว็บขณะล็อกอินเป็นหลัก
                  </p>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const cardShell =
    "overflow-hidden rounded-2xl border border-pink-100/90 bg-white shadow-md shadow-rose-100/30 ring-1 ring-rose-100/40";

  if (layout === "stack") {
    return (
      <article className={`flex h-full flex-col ${cardShell}`}>
        {media}
        {body}
      </article>
    );
  }

  return (
    <article className={`flex flex-col md:flex-row ${cardShell}`}>
      {media}
      {body}
    </article>
  );
}

const defaultBlocks = () => [{ clientId: newClientId(), type: "paragraph", text: "" }];

/**
 * @param {{ username: string; initialPosts: unknown[]; shareRewardHeartTint?: string | null }} props
 */
export default function MemberPublicPostsFeed({ username, initialPosts, shareRewardHeartTint = null }) {
  const router = useRouter();
  const { user, refresh } = useMemberAuth();
  const [posts, setPosts] = useState(() => sortPosts(initialPosts));
  const [editingId, setEditingId] = useState(null);
  /** โพสต์ใหม่: กดปุ่ม 「โพสต์」 แล้วค่อยขยายฟอร์ม */
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [blocks, setBlocks] = useState(defaultBlocks);
  const [layout, setLayout] = useState("row");
  const [sortOrder, setSortOrder] = useState(0);
  const [enableShareRewardOnCreate, setEnableShareRewardOnCreate] = useState(false);
  const [rewardPerOnCreate, setRewardPerOnCreate] = useState("5");
  const [rewardBudgetOnCreate, setRewardBudgetOnCreate] = useState("500");
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [err, setErr] = useState("");

  const isOwner = useMemo(
    () =>
      Boolean(
        user &&
          String(user.username || "").toLowerCase() ===
            String(username || "").toLowerCase()
      ),
    [user, username]
  );

  useEffect(() => {
    setPosts(sortPosts(initialPosts));
  }, [initialPosts]);

  useEffect(() => {
    if (!isOwner) return;
    const token = getMemberToken();
    if (!token) return;
    const mine = String(user?.username || "").toLowerCase();
    const pageUn = String(username || "").toLowerCase();
    if (!mine || mine !== pageUn) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiMyPublicPosts(token);
        if (cancelled || !Array.isArray(data.posts)) return;
        setPosts(sortPosts(data.posts));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOwner, username, user?.username]);

  const resetComposer = useCallback(() => {
    setEditingId(null);
    setComposerOpen(false);
    setTitle("");
    setCoverUrl("");
    setBlocks(defaultBlocks());
    setLayout("row");
    setSortOrder(0);
    setEnableShareRewardOnCreate(false);
    setRewardPerOnCreate("5");
    setRewardBudgetOnCreate("500");
    setErr("");
  }, []);

  const onEdit = useCallback((post) => {
    setEditingId(post.id);
    setComposerOpen(true);
    setTitle(String(post.title || ""));
    setCoverUrl(String(post.coverImageUrl || "").trim());
    const raw = blocksFromApi(post.bodyBlocks);
    setBlocks(raw.length ? raw : defaultBlocks());
    setLayout(post.layout === "stack" ? "stack" : "row");
    setSortOrder(Number(post.sortOrder) || 0);
    setEnableShareRewardOnCreate(false);
    setRewardPerOnCreate("5");
    setRewardBudgetOnCreate("500");
    setErr("");
    window.setTimeout(() => {
      document.getElementById("member-post-composer-anchor")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 80);
  }, []);

  const patchPostInList = useCallback((patched) => {
    if (!patched?.id) return;
    setPosts((prev) => sortPosts(prev.map((p) => (p.id === patched.id ? patched : p))));
  }, []);

  const onDelete = useCallback(
    async (post) => {
      if (!isOwner) return;
      if (!window.confirm("ลบโพสต์นี้?")) return;
      const token = getMemberToken();
      if (!token) {
        setErr("กรุณาเข้าสู่ระบบ");
        return;
      }
      setBusy(true);
      setErr("");
      try {
        await apiDeleteMyPublicPost(token, post.id);
        setPosts((prev) => sortPosts(prev.filter((p) => p.id !== post.id)));
        if (editingId === post.id) resetComposer();
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [editingId, isOwner, resetComposer, router]
  );

  const updateBlock = useCallback((clientId, patch) => {
    setBlocks((prev) =>
      prev.map((b) => (b.clientId === clientId ? { ...b, ...patch } : b))
    );
  }, []);

  const removeBlock = useCallback((clientId) => {
    setBlocks((prev) => {
      const next = prev.filter((b) => b.clientId !== clientId);
      return next.length ? next : defaultBlocks();
    });
  }, []);

  const addBlock = useCallback((type) => {
    const base = { clientId: newClientId() };
    if (type === "paragraph") {
      setBlocks((prev) => [...prev, { ...base, type: "paragraph", text: "" }]);
    } else if (type === "image") {
      setBlocks((prev) => [...prev, { ...base, type: "image", url: "" }]);
    } else {
      setBlocks((prev) => [
        ...prev,
        { ...base, type: "link", url: "", label: "" }
      ]);
    }
  }, []);

  const moveBlock = useCallback((clientId, dir) => {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.clientId === clientId);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  const onPickCover = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !isOwner) return;
    setUploadBusy(true);
    setErr("");
    try {
      const url = await uploadPostImage(file);
      setCoverUrl(url);
    } catch (ce) {
      setErr(ce instanceof Error ? ce.message : String(ce));
    } finally {
      setUploadBusy(false);
    }
  }, [isOwner]);

  const onPickBlockImage = useCallback(
    async (clientId, e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !isOwner) return;
      setUploadBusy(true);
      setErr("");
      try {
        const url = await uploadPostImage(file);
        updateBlock(clientId, { url });
      } catch (ce) {
        setErr(ce instanceof Error ? ce.message : String(ce));
      } finally {
        setUploadBusy(false);
      }
    },
    [isOwner, updateBlock]
  );

  const submit = useCallback(async () => {
    if (!isOwner) return;
    const token = getMemberToken();
    if (!token) {
      setErr("กรุณาเข้าสู่ระบบ");
      return;
    }
    const apiBlocks = blocksToApi(blocks);
    if (!String(title || "").trim()) {
      setErr("กรุณากรอกหัวข้อ");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const payload = {
        title: String(title).trim(),
        coverImageUrl: String(coverUrl || "").trim() || null,
        bodyBlocks: apiBlocks,
        layout: layout === "stack" ? "stack" : "row",
        sortOrder: Math.max(0, Math.floor(Number(sortOrder) || 0))
      };
      if (editingId) {
        const { post } = await apiPatchMyPublicPost(token, editingId, payload);
        setPosts((prev) => sortPosts(prev.map((p) => (p.id === post.id ? post : p))));
        resetComposer();
      } else {
        const { post } = await apiCreateMyPublicPost(token, payload);
        let postForList = post;
        if (enableShareRewardOnCreate) {
          const per = Math.max(0, Math.floor(Number(rewardPerOnCreate) || 0));
          const budget = Math.max(0, Math.floor(Number(rewardBudgetOnCreate) || 0));
          if (per > 0 && budget > 0) {
            try {
              const { post: startedPost } = await apiStartShareRewardCampaign(token, String(post.id), {
                redPerMember: per,
                redBudget: budget
              });
              if (startedPost) {
                postForList = startedPost;
              }
            } catch (shareErr) {
              setErr(
                `โพสต์สำเร็จ แต่เริ่มแจกหัวใจไม่สำเร็จ: ${
                  shareErr instanceof Error ? shareErr.message : String(shareErr)
                }`
              );
            }
          }
        }
        setPosts((prev) => sortPosts([...prev.filter((p) => p.id !== postForList.id), postForList]));
        resetComposer();
        window.setTimeout(() => {
          document.getElementById("member-posts-feed-anchor")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }, 80);
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [
    blocks,
    coverUrl,
    editingId,
    isOwner,
    layout,
    resetComposer,
    router,
    sortOrder,
    title
  ]);

  const showComposer = isOwner && (Boolean(editingId) || composerOpen);

  return (
    <div className="space-y-6">
      {isOwner && !showComposer ? (
        <section className="rounded-2xl border border-rose-200/90 bg-gradient-to-br from-white via-rose-50/40 to-white p-4 shadow-sm shadow-rose-100/40 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900">สร้างโพสต์ใหม่</h2>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                กด 「โพสต์」 เพื่อตั้งค่ารูปปก หัวข้อ คำอธิบาย รูปแบบการ์ด และแจกหัวใจ (ถ้าต้องการ)
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setErr("");
                setComposerOpen(true);
              }}
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-rose-200 bg-white px-6 py-2.5 text-sm font-semibold text-rose-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-50"
            >
              โพสต์
            </button>
          </div>
        </section>
      ) : null}

      {showComposer ? (
        <section
          id="member-post-composer-anchor"
          className="scroll-mt-28 rounded-2xl border border-rose-200/80 bg-white p-4 shadow-md shadow-rose-100/30 sm:scroll-mt-32 sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900">
                {editingId ? "แก้ไขโพสต์" : "สร้างโพสต์ใหม่"}
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                หัวข้อ + รูปปก · คำอธิบายประกอบด้วยย่อหน้า รูป (HTTPS) และลิงก์ข้อความ · เลือกแบบการ์ดและลำดับแสดง
              </p>
            </div>
            {!editingId ? (
              <button
                type="button"
                onClick={() => resetComposer()}
                className="shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
              >
                ปิดฟอร์ม
              </button>
            ) : null}
          </div>
          {err ? (
            <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>
          ) : null}
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-gray-600">
              รูปหัวข้อ (ปกโพสต์)
              <p className="mt-0.5 text-[11px] font-normal leading-snug text-gray-500">
                {layout === "stack"
                  ? "แนะนำแนวนอน ประมาณ 1600×1000 px (อัตราส่วน 16∶10) หรือ 1200×675 px — แสดงเต็มความกว้างการ์ดด้านบน"
                  : "แนะนำแนวนอน ประมาณ 1200×800 px (3∶2) หรือ 1200×630 px — บนจอใหญ่รูปอยู่ด้านข้างข้อความและถูกครอปให้พอดีการ์ด"}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <input type="file" accept="image/*" className="max-w-full text-sm" onChange={onPickCover} disabled={uploadBusy || busy} />
                {uploadBusy ? <span className="text-xs text-gray-500">กำลังอัปโหลด…</span> : null}
                {coverUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverUrl} alt="" className="h-16 w-24 rounded object-cover" />
                    <button
                      type="button"
                      className="text-xs text-gray-600 underline"
                      onClick={() => setCoverUrl("")}
                    >
                      เอารูปออก
                    </button>
                  </>
                ) : null}
              </div>
            </label>
            <label className="block text-xs font-medium text-gray-600">
              ชื่อหัวข้อ
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="หัวข้อโพสต์"
              />
            </label>
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium text-gray-600">คำอธิบาย</legend>
              {blocks.map((b, idx) => (
                <div
                  key={b.clientId}
                  className="rounded-lg border border-gray-100 bg-gray-50/80 p-3"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase text-gray-500">
                      {b.type === "paragraph"
                        ? "ย่อหน้า"
                        : b.type === "image"
                          ? "รูป"
                          : "ลิงก์"}
                    </span>
                    <button
                      type="button"
                      className="text-[11px] text-gray-600 hover:text-gray-900"
                      onClick={() => moveBlock(b.clientId, -1)}
                      disabled={idx === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="text-[11px] text-gray-600 hover:text-gray-900"
                      onClick={() => moveBlock(b.clientId, 1)}
                      disabled={idx >= blocks.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="text-[11px] text-red-600 hover:text-red-800"
                      onClick={() => removeBlock(b.clientId)}
                    >
                      ลบบล็อก
                    </button>
                  </div>
                  {b.type === "paragraph" ? (
                    <textarea
                      className="w-full rounded border border-gray-200 px-2 py-2 text-sm"
                      rows={4}
                      value={b.text}
                      onChange={(e) => updateBlock(b.clientId, { text: e.target.value })}
                      placeholder="ข้อความ…"
                    />
                  ) : b.type === "image" ? (
                    <div className="space-y-2">
                      <p className="text-[11px] leading-snug text-gray-500">
                        แนะนำความกว้างประมาณ 900–1200 px แนวนอน (สูงพอประมาณ) — บนหน้าเว็บจำกัดความสูงไม่ให้การ์ดยาวเกินไป
                      </p>
                      <input
                        className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                        value={b.url}
                        onChange={(e) => updateBlock(b.clientId, { url: e.target.value })}
                        placeholder="https://… (URL รูป)"
                      />
                      <div>
                        <span className="text-[11px] text-gray-500">หรืออัปโหลด: </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="text-xs"
                          onChange={(e) => onPickBlockImage(b.clientId, e)}
                          disabled={uploadBusy || busy}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-sm"
                        value={b.label}
                        onChange={(e) => updateBlock(b.clientId, { label: e.target.value })}
                        placeholder="ข้อความลิงก์"
                      />
                      <input
                        className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-sm"
                        value={b.url}
                        onChange={(e) => updateBlock(b.clientId, { url: e.target.value })}
                        placeholder="https://…"
                      />
                    </div>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  className="rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold ring-1 ring-gray-200 hover:bg-gray-50"
                  onClick={() => addBlock("paragraph")}
                >
                  + ย่อหน้า
                </button>
                <button
                  type="button"
                  className="rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold ring-1 ring-gray-200 hover:bg-gray-50"
                  onClick={() => addBlock("image")}
                >
                  + รูป
                </button>
                <button
                  type="button"
                  className="rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold ring-1 ring-gray-200 hover:bg-gray-50"
                  onClick={() => addBlock("link")}
                >
                  + ลิงก์
                </button>
              </div>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-gray-600">
                รูปแบบการ์ด
                <select
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={layout}
                  onChange={(e) => setLayout(e.target.value)}
                >
                  <option value="row">แบบแถว — รูปซ้าย ข้อความขวา (1 การ์ดต่อแถว)</option>
                  <option value="stack">แบบซ้อน — รูปบน ข้อความล่าง (2 การ์ดต่อแถวบนจอใหญ่)</option>
                </select>
              </label>
              <label className="block text-xs font-medium text-gray-600">
                ลำดับแสดง (เลขน้อยขึ้นก่อน)
                <input
                  type="number"
                  min={0}
                  max={999999}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                />
              </label>
            </div>
            {!editingId ? (
              <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-3">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={enableShareRewardOnCreate}
                    onChange={(e) => setEnableShareRewardOnCreate(e.target.checked)}
                  />
                  ตั้งค่าแจกหัวใจแดงจากโพสต์นี้ทันทีหลังโพสต์
                </label>
                {enableShareRewardOnCreate ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-medium text-gray-600">
                      หัวใจแดงต่อ 1 คน
                      <input
                        type="number"
                        min={1}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        value={rewardPerOnCreate}
                        onChange={(e) => setRewardPerOnCreate(e.target.value)}
                      />
                    </label>
                    <label className="block text-xs font-medium text-gray-600">
                      วงเงินรวมสูงสุด
                      <input
                        type="number"
                        min={1}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        value={rewardBudgetOnCreate}
                        onChange={(e) => setRewardBudgetOnCreate(e.target.value)}
                      />
                    </label>
                    <p className="sm:col-span-2 text-[11px] leading-snug text-gray-600">
                      ระบบจะกันวงเงินจากหัวใจแดงของคุณหลังโพสต์สำเร็จ และผู้แชร์ที่เข้าเงื่อนไขจะได้คนละครั้ง
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={submit}
                disabled={busy || uploadBusy}
                className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {busy ? "กำลังบันทึก…" : editingId ? "บันทึกการแก้ไข" : "โพสต์"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetComposer}
                  disabled={busy}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                >
                  ยกเลิกการแก้ไข
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {posts.length === 0 ? (
        <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-rose-200/80 bg-gradient-to-b from-white to-rose-50/30 p-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-800">ยังไม่มีโพสต์</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            {isOwner
              ? "กด 「โพสต์」 ด้านบนเพื่อสร้างโพสต์แรก — ผู้เยี่ยมชมจะเห็นการ์ดที่นี่"
              : "สมาชิกยังไม่ได้เพิ่มโพสต์บนเพจนี้"}
          </p>
        </div>
      ) : (
        <div id="member-posts-feed-anchor" className="scroll-mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {posts.map((p) => (
              <div
                key={p.id}
                className={p.layout === "stack" ? "" : "md:col-span-2"}
              >
                <MemberPublicPostCard
                  post={p}
                  pageUsername={username}
                  viewerUsername={user?.username}
                  isOwner={isOwner}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onPostUpdated={patchPostInList}
                  refreshMemberProfile={refresh}
                  shareRewardHeartTint={shareRewardHeartTint}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
