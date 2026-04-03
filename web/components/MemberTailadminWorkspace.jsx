"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { getApiBase } from "../lib/config";
import {
  TAILADMIN_PROFILE_START,
  TAILADMIN_SHOP_DASHBOARD_START
} from "../lib/memberWorkspacePath";
import HomeStylePublicHeader from "./HomeStylePublicHeader";
import { useMemberAuth } from "./MemberAuthProvider";

function normalizeHuajaiyStart(raw) {
  if (raw == null || String(raw).trim() === "") return TAILADMIN_PROFILE_START;
  const s = String(raw).trim().split("?")[0].slice(0, 200);
  if (s === "/") return TAILADMIN_SHOP_DASHBOARD_START;
  return s.startsWith("/") ? s : `/${s}`;
}

/** พื้นที่สมาชิก production — หัวเว็บ + TailAdmin iframe */
export default function MemberTailadminWorkspace() {
  const { user, loading } = useMemberAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const iframeRef = useRef(null);

  const iframeSrc = useMemo(() => {
    const start = normalizeHuajaiyStart(searchParams.get("huajaiy_start"));
    return `/tailadmin-template/?huajaiy_start=${encodeURIComponent(start)}`;
  }, [searchParams]);

  const postToIframe = useCallback((payload) => {
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    try {
      w.postMessage(payload, window.location.origin);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleIframeSidebar = useCallback(() => {
    postToIframe({ type: "HUAJAIY_TOGGLE_SIDEBAR" });
  }, [postToIframe]);

  const pushMemberToIframe = useCallback(() => {
    if (!user) return;
    postToIframe({ type: "HUAJAIY_MEMBER_CHROME" });
    postToIframe({
      type: "HUAJAIY_MEMBER",
      apiBase: getApiBase(),
      user
    });
  }, [user, postToIframe]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    pushMemberToIframe();
  }, [user, pushMemberToIframe]);

  if (loading || !user) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-100 text-sm text-slate-600">
        กำลังโหลด…
      </main>
    );
  }

  return (
    <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-white">
      <HomeStylePublicHeader
        onHamburgerClick={toggleIframeSidebar}
        lineProfileImageUrl={user.linePictureUrl || undefined}
        profileDisplayName={
          [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
          "สมาชิก"
        }
      />
      <main className="min-h-0 flex-1 overflow-hidden bg-slate-100">
        <iframe
          key={iframeSrc}
          ref={iframeRef}
          title="ระบบสมาชิก HUAJAIY"
          src={iframeSrc}
          className="h-full w-full border-0"
          onLoad={pushMemberToIframe}
        />
      </main>
    </div>
  );
}
