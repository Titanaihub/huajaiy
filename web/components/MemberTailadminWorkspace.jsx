"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const MEMBER_GAME_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
import { useCallback, useEffect, useMemo, useRef } from "react";
import { getApiBase } from "../lib/config";
import {
  isMemberShellIframeClosedSlug,
  memberAppPathForTail,
  memberClosedShellPlaceholderText,
  memberTailPathFromSlug,
  normalizeMemberTailPath,
  parseMemberAppPath,
  TAILADMIN_SHOP_DASHBOARD_START
} from "../lib/memberWorkspacePath";
import { getMemberToken } from "../lib/memberApi";
import CentralTemplatePreviewDemo from "./CentralTemplatePreviewDemo";
import HuajaiyCentralTemplate from "./HuajaiyCentralTemplate";
import MemberHomeProfileLanding from "./MemberHomeProfileLanding";
import { useMemberAuth } from "./MemberAuthProvider";
import { memberShellLabelForSlug } from "../lib/memberSidebarNav";

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

  const closedShellSlug = useMemo(() => {
    if (!parsed || parsed.segments.length !== 1) return null;
    const seg = parsed.segments[0];
    return isMemberShellIframeClosedSlug(seg) ? seg : null;
  }, [parsed]);

  const tailForIframe = useMemo(() => {
    if (!parsed) return TAILADMIN_SHOP_DASHBOARD_START;
    if (parsed.segments.length === 0) return TAILADMIN_SHOP_DASHBOARD_START;
    if (parsed.segments.length > 1) return null;
    if (isMemberShellIframeClosedSlug(parsed.segments[0])) return null;
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
    if (parsed.segments.length === 1 && tailForIframe === null && !closedShellSlug) {
      router.replace("/member");
    }
  }, [parsed, tailForIframe, closedShellSlug, user, router]);

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
    const token = typeof window !== "undefined" ? getMemberToken() : null;
    postToIframe({
      type: "HUAJAIY_MEMBER",
      apiBase: getApiBase(),
      user,
      shellPlaceholderText: closedShellSlug
        ? memberClosedShellPlaceholderText(closedShellSlug)
        : "",
      ...(token ? { token } : {})
    });
  }, [user, postToIframe, closedShellSlug]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    pushMemberToIframe();
  }, [user, pushMemberToIframe, iframeSrc, closedShellSlug]);

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

  if (
    parsed.segments.length > 1 ||
    (parsed.segments.length === 1 && tailForIframe === null && !closedShellSlug)
  ) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-100 text-sm text-slate-600">
        กำลังไปหน้าภาพรวม…
      </main>
    );
  }

  /** `/member` เท่านั้น — หน้าโปรไฟล์รวมแบบใหม่ */
  const isMemberRoot = parsed.segments.length === 0;
  if (isMemberRoot) {
    return (
      <HuajaiyCentralTemplate
        onHamburgerClick={toggleIframeSidebar}
        lineProfileImageUrl={user.linePictureUrl || undefined}
        profileDisplayName={
          [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
          "สมาชิก"
        }
        pinkBarMenuLabel="ข้อมูลสมาชิก"
        mainClassName="flex min-h-0 min-w-0 flex-1 flex-col bg-[#fce7f3]/45"
      >
        <CentralTemplatePreviewDemo
          variant="memberProfileTop"
          sectionLabel="ข้อมูลสมาชิก"
        />
        <MemberHomeProfileLanding user={user} />
      </HuajaiyCentralTemplate>
    );
  }

  const shellSlug = parsed.segments[0] || "";
  const sectionLabel = memberShellLabelForSlug(shellSlug);

  return (
    <HuajaiyCentralTemplate
      onHamburgerClick={toggleIframeSidebar}
      lineProfileImageUrl={user.linePictureUrl || undefined}
      profileDisplayName={
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
        "สมาชิก"
      }
      pinkBarMenuLabel={sectionLabel || undefined}
      mainClassName="flex min-h-0 min-w-0 flex-1 flex-col bg-[#fce7f3]/45"
    >
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
        <section className="shrink-0" aria-label="เทมเพลตกลาง">
          <CentralTemplatePreviewDemo variant="memberShellTop" />
        </section>

        <section
          className="mt-1 flex min-h-0 w-full flex-1 flex-col border-t border-pink-200/90 bg-white/50"
          aria-label="เนื้อหาระบบเดิม"
        >
          <div className="border-b border-pink-100/90 bg-white/80 px-3 py-2 text-center sm:px-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              ระบบเดิม · ลิงก์เดิม
            </p>
            <p className="mt-0.5 text-[11px] text-neutral-500">
              TailAdmin / เมนูเดิม — ใช้งานเหมือนเปิดจากเมนูก่อนหน้า
            </p>
          </div>
          <div className="min-h-0 w-full flex-1 bg-slate-100/80">
            <iframe
              key={iframeSrc}
              ref={iframeRef}
              title={`ระบบสมาชิก HUAJAIY — ${sectionLabel || shellSlug || "สมาชิก"}`}
              src={iframeSrc}
              className="h-[min(78dvh,880px)] min-h-[360px] w-full border-0 sm:min-h-[420px]"
              onLoad={pushMemberToIframe}
            />
          </div>
        </section>
      </div>
    </HuajaiyCentralTemplate>
  );
}
