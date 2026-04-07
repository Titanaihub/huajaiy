"use client";

import { Suspense, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  adminAppPathForTail,
  isAdminDashboardShellSlug,
  isMemberShellIframeClosedSlug,
  memberClosedShellPlaceholderText,
  memberTailPathFromSlug,
  parseAdminAppPath,
  TAILADMIN_SHOP_DASHBOARD_START
} from "../lib/memberWorkspacePath";
import { adminPinkBarMenuLabelFromPathname } from "../lib/memberSidebarNav";
import AdminDashboard from "./AdminDashboard";
import HuajaiyCentralTemplate from "./HuajaiyCentralTemplate";
import MemberWorkspaceMainPanels from "./MemberWorkspaceMainPanels";
import { useMemberAuth } from "./MemberAuthProvider";

function legacyTailFromQuery(raw) {
  if (raw == null || String(raw).trim() === "") {
    return TAILADMIN_SHOP_DASHBOARD_START;
  }
  const s = String(raw).trim().split("?")[0].slice(0, 200);
  if (s === "/") return TAILADMIN_SHOP_DASHBOARD_START;
  return s.startsWith("/") ? s : `/${s}`;
}

function noopHamburger() {}

/** พื้นที่แอดมิน — HuajaiyCentralTemplate + แผง React (ไม่ใช้ TailAdmin iframe) */
export default function AdminTailadminWorkspace() {
  const { user, loading } = useMemberAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const parsed = useMemo(() => parseAdminAppPath(pathname), [pathname]);

  const pinkBarLabel = useMemo(
    () => adminPinkBarMenuLabelFromPathname(pathname),
    [pathname]
  );

  const closedShellSlug = useMemo(() => {
    if (!parsed || parsed.segments.length !== 1) return null;
    const seg = parsed.segments[0];
    return isMemberShellIframeClosedSlug(seg) ? seg : null;
  }, [parsed]);

  const tailForIframe = useMemo(() => {
    if (!parsed) return TAILADMIN_SHOP_DASHBOARD_START;
    if (parsed.segments.length === 0) return TAILADMIN_SHOP_DASHBOARD_START;
    if (parsed.segments.length > 1) return null;
    const seg0 = parsed.segments[0];
    if (isAdminDashboardShellSlug(seg0)) return TAILADMIN_SHOP_DASHBOARD_START;
    if (isMemberShellIframeClosedSlug(seg0)) return null;
    return memberTailPathFromSlug(seg0);
  }, [parsed]);

  const legacyStart = searchParams.get("huajaiy_start");
  const hasLegacyQuery =
    legacyStart != null && String(legacyStart).trim() !== "";

  useEffect(() => {
    if (!hasLegacyQuery) return;
    const tail = legacyTailFromQuery(legacyStart);
    const dest = adminAppPathForTail(tail);
    router.replace(dest);
  }, [hasLegacyQuery, legacyStart, router]);

  useEffect(() => {
    if (!parsed || !user) return;
    if (parsed.segments.length > 1) {
      router.replace("/admin");
      return;
    }
    if (parsed.segments.length === 1) {
      const seg0 = parsed.segments[0];
      if (isAdminDashboardShellSlug(seg0)) return;
      if (closedShellSlug) return;
      if (tailForIframe === null) {
        router.replace("/admin");
      }
    }
  }, [parsed, tailForIframe, closedShellSlug, user, router]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?admin=1");
      return;
    }
    if (user.role !== "admin") {
      router.replace("/member");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#fce7f3]/45 text-sm text-slate-600">
        กำลังโหลด…
      </main>
    );
  }

  if (user.role !== "admin") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#fce7f3]/45 text-sm text-slate-600">
        กำลังเปลี่ยนเส้นทางไประบบสมาชิก…
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
        กำลังไปหน้าแอดมิน…
      </main>
    );
  }

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username ||
    "แอดมิน";

  const templateShell = (children) => (
    <HuajaiyCentralTemplate
      onHamburgerClick={noopHamburger}
      lineProfileImageUrl={user.linePictureUrl || undefined}
      profileDisplayName={displayName}
      pinkBarMenuLabel={pinkBarLabel}
      mainClassName="flex min-h-0 min-w-0 flex-1 flex-col bg-[#fce7f3]/45"
    >
      {children}
    </HuajaiyCentralTemplate>
  );

  /** แผงแอดมิน React — /admin หรือ /admin/members ฯลฯ */
  const isAdminDashRoute =
    parsed.segments.length === 0 ||
    (parsed.segments.length === 1 &&
      isAdminDashboardShellSlug(parsed.segments[0]));

  if (isAdminDashRoute) {
    return templateShell(
      <div className="mx-auto w-full max-w-[1200px] flex-1 min-h-0 overflow-y-auto px-3 py-4 sm:px-5 sm:py-6">
        <Suspense
          fallback={
            <p className="text-sm text-slate-600" aria-live="polite">
              กำลังโหลดแผงแอดมิน…
            </p>
          }
        >
          <AdminDashboard />
        </Suspense>
      </div>
    );
  }

  const shellSlug = parsed.segments[0] || "";

  if (closedShellSlug) {
    return templateShell(
      <div className="mx-auto flex min-h-[40vh] w-full max-w-[1200px] flex-1 items-center justify-center px-3 py-10 sm:px-5">
        <p className="text-center text-lg font-semibold text-slate-700">
          {memberClosedShellPlaceholderText(closedShellSlug)}
        </p>
      </div>
    );
  }

  return templateShell(
    <div className="mx-auto w-full max-w-[1200px] flex-1 min-h-0 overflow-y-auto px-3 py-6 sm:px-5 sm:py-8">
      <MemberWorkspaceMainPanels slug={shellSlug} />
    </div>
  );
}
