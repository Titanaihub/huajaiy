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
      <div className="flex min-h-[40vh] items-center justify-center px-4 py-16 text-sm text-gray-600">
        กำลังโหลดโพสต์…
      </div>
    );
  }

  if (dead || !post) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-lg font-semibold text-gray-900">ไม่พบโพสต์</h1>
        <p className="mt-2 text-sm text-gray-600">
          โพสต์นี้ไม่มีหรือเพจยังไม่ได้เผยแพร่
        </p>
        <Link
          href="/"
          className="mt-6 inline-block font-medium text-rose-600 underline decoration-rose-300 underline-offset-2 hover:text-rose-700"
        >
          กลับหน้าแรก
        </Link>
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
