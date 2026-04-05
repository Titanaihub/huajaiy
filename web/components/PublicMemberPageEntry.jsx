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
      <div className="flex min-h-[40vh] items-center justify-center px-4 py-16 text-sm text-gray-600">
        กำลังโหลดเพจ…
      </div>
    );
  }

  if (dead || !member) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-lg font-semibold text-gray-900">ไม่พบเพจ</h1>
        <p className="mt-2 text-sm text-gray-600">
          เพจนี้ยังไม่ได้เผยแพร่หรือไม่มีอยู่
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

  return <PublicMemberPageChrome member={member} initialPosts={posts} />;
}
