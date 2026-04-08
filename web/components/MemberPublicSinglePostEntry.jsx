"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getApiBase } from "../lib/config";
import { getMemberToken } from "../lib/memberApi";
import MemberPublicSinglePostClient from "./MemberPublicSinglePostClient";

/**
 * โหลดโพสต์สาธารณะจาก SSR ถ้าเพจเผยแพร่แล้ว · ถ้ายังไม่เผยแพร่ให้ลอง Bearer สำหรับเจ้าของเพจ
 */
export default function MemberPublicSinglePostEntry({
  username,
  postId,
  initialPost,
  refUsername = ""
}) {
  const un = String(username || "").trim().toLowerCase();
  const pid = String(postId || "").trim();
  const [post, setPost] = useState(initialPost);
  const [phase, setPhase] = useState(() => (initialPost ? "ready" : "loading"));
  const [dead, setDead] = useState(false);

  useEffect(() => {
    if (initialPost && typeof initialPost === "object" && initialPost.id) {
      setPost(initialPost);
      setPhase("ready");
      setDead(false);
      return;
    }

    let cancelled = false;
    setPost(null);
    setPhase("loading");
    setDead(false);

    (async () => {
      const base = getApiBase().replace(/\/$/, "");
      const token = getMemberToken();
      const headers = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      try {
        const r = await fetch(
          `${base}/api/public/members/${encodeURIComponent(un)}/posts/${encodeURIComponent(pid)}`,
          { cache: "no-store", headers }
        );
        if (cancelled) return;
        if (!r.ok) {
          setDead(true);
          setPhase("done");
          return;
        }
        const data = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (!data.ok || !data.post) {
          setDead(true);
          setPhase("done");
          return;
        }
        setPost(data.post);
        setPhase("ready");
      } catch {
        if (!cancelled) {
          setDead(true);
          setPhase("done");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [un, pid, initialPost]);

  if (phase === "loading") {
    return (
      <div className="mx-auto flex min-h-[45vh] w-full max-w-[1200px] flex-col items-center justify-center px-4 py-16">
        <p className="text-sm font-medium text-neutral-600">กำลังโหลดโพสต์…</p>
        <div
          className="mt-3 h-1.5 w-24 animate-pulse rounded-full bg-pink-200/90"
          aria-hidden
        />
      </div>
    );
  }

  if (dead || !post) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-20 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-pink-200/70 bg-white/90 px-6 py-10 shadow-sm">
          <h1 className="text-lg font-semibold text-neutral-900">ไม่พบโพสต์</h1>
          <p className="mt-2 text-sm text-neutral-600">
            โพสต์นี้ไม่มีหรือเพจยังไม่ได้เผยแพร่
          </p>
          <Link
            href="/"
            className="mt-6 inline-block font-semibold text-[#FF2E8C] underline decoration-pink-300 underline-offset-2 hover:text-rose-700"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </div>
    );
  }

  return (
    <MemberPublicSinglePostClient
      username={un}
      post={post}
      refUsername={refUsername}
    />
  );
}
