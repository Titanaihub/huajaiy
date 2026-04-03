"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const MEMBER_GAME_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
import { useCallback, useEffect, useMemo, useRef } from "react";
import { getApiBase } from "../lib/config";
import {
  memberAppPathForTail,
  memberTailPathFromSlug,
  normalizeMemberTailPath,
  parseMemberAppPath,
  TAILADMIN_SHOP_DASHBOARD_START
} from "../lib/memberWorkspacePath";
import HomeStylePublicHeader from "./HomeStylePublicHeader";
import { useMemberAuth } from "./MemberAuthProvider";

function legacyTailFromQuery(raw) {
  if (raw == null || String(raw).trim() === "") {
    return TAILADMIN_SHOP_DASHBOARD_START;
  }
  const s = String(raw).trim().split("?")[0].slice(0, 200);
  if (s === "/") return TAILADMIN_SHOP_DASHBOARD_START;
  return s.startsWith("/") ? s : `/${s}`;
}

/** พื้นที่สมาชิก production — หัวเว็บ + TailAdmin iframe (URL สวย /member/shops) */
export default function MemberTailadminWorkspace() {
  const { user, loading } = useMemberAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const iframeRef = useRef(null);

  const parsed = useMemo(() => parseMemberAppPath(pathname), [pathname]);

  const tailForIframe = useMemo(() => {
    if (!parsed) return TAILADMIN_SHOP_DASHBOARD_START;
    if (parsed.segments.length === 0) return TAILADMIN_SHOP_DASHBOARD_START;
    if (parsed.segments.length > 1) return null;
    return memberTailPathFromSlug(parsed.segments[0]);
  }, [parsed]);

  const legacyStart = searchParams.get("huajaiy_start");
  const hasLegacyQuery =
    legacyStart != null && String(legacyStart).trim() !== "";

  useEffect(() => {
    if (!hasLegacyQuery) return;
    const tail = legacyTailFromQuery(legacyStart);
    const dest = memberAppPathForTail(tail);
    router.replace(dest);
  }, [hasLegacyQuery, legacyStart, router]);

  useEffect(() => {
    if (!parsed || !user) return;
    if (parsed.segments.length > 1) {
      router.replace("/member");
      return;
    }
    if (parsed.segments.length === 1 && tailForIframe === null) {
      router.replace("/member");
    }
  }, [parsed, tailForIframe, user, router]);

  const iframeSrc = useMemo(() => {
    const start =
      tailForIframe == null
        ? TAILADMIN_SHOP_DASHBOARD_START
        : normalizeMemberTailPath(tailForIframe);
    let src = `/tailadmin-template/?huajaiy_start=${encodeURIComponent(start)}`;
    const gameQ = searchParams.get("game");
    if (gameQ && MEMBER_GAME_UUID_RE.test(String(gameQ).trim())) {
      src += `&member_game=${encodeURIComponent(String(gameQ).trim())}`;
    }
    return src;
  }, [tailForIframe, searchParams]);

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
  }, [user, pushMemberToIframe, iframeSrc]);

  if (loading || !user) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-100 text-sm text-slate-600">
        กำลังโหลด…
      </main>
    );
  }

  if (hasLegacyQuery) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-100 text-sm text-slate-600">
        กำลังเปลี่ยนเส้นทาง…
      </main>
    );
  }

  if (!parsed) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-100 text-sm text-slate-600">
        กำลังโหลด…
      </main>
    );
  }

  if (parsed.segments.length > 1 || (parsed.segments.length === 1 && tailForIframe === null)) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-100 text-sm text-slate-600">
        กำลังไปหน้าภาพรวม…
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
