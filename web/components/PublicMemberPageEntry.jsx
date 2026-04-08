"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getApiBase } from "../lib/config";
import { getMemberToken } from "../lib/memberApi";
import PublicMemberPageChrome from "./PublicMemberPageChrome";

/**
 * โหลดเพจสมาชิกจาก SSR ถ้าเผยแพร่แล้ว · ถ้ายังไม่เผยแพร่ให้ลอง Bearer ฝั่งเจ้าของเพจ
 */
export default function PublicMemberPageEntry({ username, initialMember, initialPosts }) {
  const un = String(username || "").trim().toLowerCase();
  const [member, setMember] = useState(initialMember);
  const [posts, setPosts] = useState(() =>
    Array.isArray(initialPosts) ? initialPosts : []
  );
  const [phase, setPhase] = useState(() => (initialMember ? "ready" : "loading"));
  const [dead, setDead] = useState(false);

  useEffect(() => {
    const im = initialMember;
    if (
      im &&
      typeof im === "object" &&
      String(im.username || "").trim().toLowerCase() === un
    ) {
      setMember(im);
      setPosts(Array.isArray(initialPosts) ? initialPosts : []);
      setPhase("ready");
      setDead(false);
      return;
    }

    let cancelled = false;
    setMember(null);
    setPosts([]);
    setPhase("loading");
    setDead(false);

    (async () => {
      const base = getApiBase().replace(/\/$/, "");
      const token = getMemberToken();
      const headers = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      try {
        const mr = await fetch(
          `${base}/api/public/members/${encodeURIComponent(un)}`,
          { cache: "no-store", headers }
        );
        if (cancelled) return;
        if (!mr.ok) {
          setDead(true);
          setPhase("done");
          return;
        }
        const data = await mr.json().catch(() => ({}));
        if (cancelled) return;
        if (!data.ok) {
          setDead(true);
          setPhase("done");
          return;
        }
        setMember(data);
        const pr = await fetch(
          `${base}/api/public/members/${encodeURIComponent(un)}/posts`,
          { cache: "no-store", headers }
        );
        const pd = await pr.json().catch(() => ({}));
        if (cancelled) return;
        setPosts(pr.ok && pd.ok && Array.isArray(pd.posts) ? pd.posts : []);
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
  }, [un, initialMember]);

  if (phase === "loading") {
    return (
      <div className="mx-auto flex min-h-[45vh] w-full max-w-[1200px] flex-col items-center justify-center px-4 py-16">
        <p className="text-sm font-medium text-neutral-600">กำลังโหลดเพจ…</p>
        <div
          className="mt-3 h-1.5 w-24 animate-pulse rounded-full bg-pink-200/90"
          aria-hidden
        />
      </div>
    );
  }

  if (dead || !member) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-20 text-center">
        <div className="mx-auto max-w-md rounded-2xl border border-pink-200/70 bg-white/90 px-6 py-10 shadow-sm">
          <h1 className="text-lg font-semibold text-neutral-900">ไม่พบเพจ</h1>
          <p className="mt-2 text-sm text-neutral-600">
            เพจนี้ยังไม่ได้เผยแพร่หรือไม่มีอยู่
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

  return <PublicMemberPageChrome member={member} initialPosts={posts} />;
}
