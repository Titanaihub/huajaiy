"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import {
  isMemberShellIframeClosedSlug,
  memberAppPathForTail,
  memberClosedShellPlaceholderText,
  memberTailPathFromSlug,
  parseMemberAppPath,
  TAILADMIN_SHOP_DASHBOARD_START
} from "../lib/memberWorkspacePath";
import HuajaiyCentralTemplate from "./HuajaiyCentralTemplate";
import MemberHomeProfileLanding from "./MemberHomeProfileLanding";
import MemberWorkspaceMainPanels from "./MemberWorkspaceMainPanels";
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

function noopHamburger() {}

/** พื้นที่สมาชิก production — หัวเว็บ + เนื้อหา React ใต้ HuajaiyCentralTemplate (ไม่ใช้ iframe) */
export default function MemberTailadminWorkspace() {
  const { user, loading } = useMemberAuth();
  const router = useRouter();
  const pathname = usePathname();

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

  const searchParams = useSearchParams();
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

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#fce7f3]/45 text-sm text-slate-600">
        กำลังโหลด…
      </main>
    );
  }

  if (hasLegacyQuery) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#fce7f3]/45 text-sm text-slate-600">
        กำลังเปลี่ยนเส้นทาง…
      </main>
    );
  }

  if (!parsed) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#fce7f3]/45 text-sm text-slate-600">
        กำลังโหลด…
      </main>
    );
  }

  if (
    parsed.segments.length > 1 ||
    (parsed.segments.length === 1 && tailForIframe === null && !closedShellSlug)
  ) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#fce7f3]/45 text-sm text-slate-600">
        กำลังไปหน้าภาพรวม…
      </main>
    );
  }

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || "สมาชิก";

  const templateShell = (children, pinkBarMenuLabel) => (
    <HuajaiyCentralTemplate
      onHamburgerClick={noopHamburger}
      lineProfileImageUrl={user.linePictureUrl || undefined}
      profileDisplayName={displayName}
      pinkBarMenuLabel={pinkBarMenuLabel}
      mainClassName="flex min-h-0 min-w-0 flex-1 flex-col bg-[#fce7f3]/45"
    >
      {children}
    </HuajaiyCentralTemplate>
  );

  /** `/member` — ภาพรวมบัญชี */
  const isMemberRoot = parsed.segments.length === 0;
  if (isMemberRoot) {
    return templateShell(
      <MemberHomeProfileLanding user={user} />,
      "ข้อมูลสมาชิก"
    );
  }

  const shellSlug = parsed.segments[0] || "";
  const sectionLabel = memberShellLabelForSlug(shellSlug);

  if (closedShellSlug) {
    return templateShell(
      <div className="mx-auto flex min-h-[40vh] w-full max-w-[1200px] flex-1 items-center justify-center px-3 py-10 sm:px-5">
        <p className="text-center text-lg font-semibold text-slate-700">
          {memberClosedShellPlaceholderText(closedShellSlug)}
        </p>
      </div>,
      sectionLabel || undefined
    );
  }

  return templateShell(
    <div className="mx-auto w-full max-w-[1200px] flex-1 min-h-0 overflow-y-auto px-3 py-6 sm:px-5 sm:py-8">
      <MemberWorkspaceMainPanels slug={shellSlug} />
    </div>,
    sectionLabel || undefined
  );
}
