"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { getApiBase } from "../lib/config";
import {
  adminAppPathForTail,
  adminDashTabFromSlug,
  isAdminDashboardShellSlug,
  isMemberShellIframeClosedSlug,
  isValidAdminDashboardTabKey,
  memberClosedShellPlaceholderText,
  memberTailPathFromSlug,
  normalizeMemberTailPath,
  parseAdminAppPath,
  TAILADMIN_SHOP_DASHBOARD_START
} from "../lib/memberWorkspacePath";
import { getMemberToken } from "../lib/memberApi";
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

/**
 * ฝังแผง React (AdminDashboard) จาก /admin/embed/panel เฉพาะหน้า «ภาพรวม» (/admin) — หน้าย่อยใช้ Vue เต็มพื้นที่
 */
const SHOW_LEGACY_ADMIN_PANEL_EMBED = true;

export default function AdminTailadminWorkspace() {
  const { user, loading } = useMemberAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const iframeRef = useRef(null);

  const parsed = useMemo(() => parseAdminAppPath(pathname), [pathname]);

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

  const iframeSrc = useMemo(() => {
    const start =
      tailForIframe == null
        ? TAILADMIN_SHOP_DASHBOARD_START
        : normalizeMemberTailPath(tailForIframe);
    return `/tailadmin-template/?huajaiy_start=${encodeURIComponent(start)}`;
  }, [tailForIframe]);

  const showLegacyEmbed = useMemo(() => {
    if (!parsed) return false;
    if (parsed.segments.length === 0) return SHOW_LEGACY_ADMIN_PANEL_EMBED;
    if (parsed.segments.length === 1 && isAdminDashboardShellSlug(parsed.segments[0])) {
      return SHOW_LEGACY_ADMIN_PANEL_EMBED;
    }
    return false;
  }, [parsed]);

  const resolvedEmbedTab = useMemo(() => {
    if (parsed && parsed.segments.length === 1) {
      const fromPath = adminDashTabFromSlug(parsed.segments[0]);
      if (fromPath) return fromPath;
    }
    const q = searchParams.get("tab");
    if (q && isValidAdminDashboardTabKey(q)) return q;
    return "members";
  }, [parsed, searchParams]);

  const panelUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const qs = new URLSearchParams(searchParams.toString());
    qs.set("tab", resolvedEmbedTab);
    const qstr = qs.toString();
    return `${window.location.origin}/admin/embed/panel?${qstr}`;
  }, [searchParams, resolvedEmbedTab]);

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

  const syncIframe = useCallback(() => {
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
    if (
      user.role === "admin" &&
      showLegacyEmbed &&
      panelUrl
    ) {
      postToIframe({ type: "HUAJAIY_ADMIN_EMBED", url: panelUrl });
    } else {
      postToIframe({ type: "HUAJAIY_ADMIN_EMBED", url: "" });
    }
  }, [user, panelUrl, postToIframe, showLegacyEmbed, closedShellSlug]);

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

  useEffect(() => {
    if (!user || loading) return;
    syncIframe();
  }, [user, loading, panelUrl, syncIframe, iframeSrc, closedShellSlug]);

  if (loading || !user) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-100 text-sm text-slate-600">
        กำลังโหลด…
      </main>
    );
  }

  if (user.role !== "admin") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-100 text-sm text-slate-600">
        กำลังเปลี่ยนเส้นทางไประบบสมาชิก…
      </main>
    );
  }

  const isAdmin = user.role === "admin";
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username ||
    (isAdmin ? "แอดมิน" : "สมาชิก");

  return (
    <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-white">
      <HomeStylePublicHeader
        onHamburgerClick={toggleIframeSidebar}
        lineProfileImageUrl={user.linePictureUrl || undefined}
        profileDisplayName={displayName}
      />
      <main className="relative min-h-0 flex-1 overflow-hidden bg-slate-100">
        <iframe
          key={iframeSrc}
          ref={iframeRef}
          title={isAdmin ? "ระบบแอดมิน HUAJAIY" : "HUAJAIY"}
          src={iframeSrc}
          className="h-full w-full border-0"
          onLoad={syncIframe}
        />
      </main>
    </div>
  );
}
