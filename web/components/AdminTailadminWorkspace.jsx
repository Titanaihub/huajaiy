"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { getApiBase } from "../lib/config";
import {
  adminAppPathForTail,
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
 * ฝังแผง React เดิม (/admin/panel) เฉพาะหน้า «ภาพรวม» (/admin) — หน้าย่อยใช้ Vue เต็มพื้นที่
 */
const SHOW_LEGACY_ADMIN_PANEL_EMBED = true;

export default function AdminTailadminWorkspace() {
  const { user, loading } = useMemberAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const iframeRef = useRef(null);

  const parsed = useMemo(() => parseAdminAppPath(pathname), [pathname]);

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
    const dest = adminAppPathForTail(tail);
    router.replace(dest);
  }, [hasLegacyQuery, legacyStart, router]);

  useEffect(() => {
    if (!parsed || !user) return;
    if (parsed.segments.length > 1) {
      router.replace("/admin");
      return;
    }
    if (parsed.segments.length === 1 && tailForIframe === null) {
      router.replace("/admin");
    }
  }, [parsed, tailForIframe, user, router]);

  const iframeSrc = useMemo(() => {
    const start =
      tailForIframe == null
        ? TAILADMIN_SHOP_DASHBOARD_START
        : normalizeMemberTailPath(tailForIframe);
    return `/tailadmin-template/?huajaiy_start=${encodeURIComponent(start)}`;
  }, [tailForIframe]);

  const showLegacyEmbed = useMemo(() => {
    if (!parsed || parsed.segments.length !== 0) return false;
    return SHOW_LEGACY_ADMIN_PANEL_EMBED;
  }, [parsed]);

  const panelUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const qs = searchParams.toString();
    return `${window.location.origin}/admin/panel${qs ? `?${qs}` : ""}`;
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

  const syncIframe = useCallback(() => {
    if (!user) return;
    postToIframe({ type: "HUAJAIY_MEMBER_CHROME" });
    const token = typeof window !== "undefined" ? getMemberToken() : null;
    postToIframe({
      type: "HUAJAIY_MEMBER",
      apiBase: getApiBase(),
      user,
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
  }, [user, panelUrl, postToIframe, showLegacyEmbed]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || loading) return;
    syncIframe();
  }, [user, loading, panelUrl, syncIframe, iframeSrc]);

  if (loading || !user) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-100 text-sm text-slate-600">
        กำลังโหลด…
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
          title={
            isAdmin ? "ระบบแอดมิน HUAJAIY" : "พื้นที่ผู้ดูแลระบบ — จำกัดสิทธิ์"
          }
          src={iframeSrc}
          className="h-full w-full border-0"
          onLoad={syncIframe}
        />

        {!isAdmin && (
          <div className="pointer-events-none absolute inset-0 flex justify-center overflow-y-auto pt-6 pb-10 sm:pt-10">
            <div className="pointer-events-auto mx-4 w-full max-w-2xl shrink-0 rounded-xl border border-amber-200/90 bg-amber-50/95 p-4 text-sm text-amber-950 shadow-lg shadow-amber-900/10 backdrop-blur-sm sm:p-5">
              <h1 className="text-lg font-bold text-slate-900">พื้นที่ผู้ดูแลระบบ</h1>
              <p className="mt-1 text-slate-600">
                บัญชีของคุณยังไม่มีสิทธิ์ <strong className="text-slate-800">admin</strong>
                — ด้านหลังเป็นเทมเพลตแดชบอร์ด (แสดงเมื่อไม่มีสิทธิ์เข้าจัดการ)
              </p>
              <p className="mt-2 text-slate-600">
                ถ้าคุณเป็นสมาชิก ให้ใช้{" "}
                <a
                  href="/member"
                  className="font-semibold text-rose-700 underline decoration-rose-300 underline-offset-2 hover:text-rose-800"
                >
                  พื้นที่สมาชิก
                </a>
              </p>
              <div className="mt-4 border-t border-amber-200/80 pt-4">
                <p className="font-medium text-amber-950">บัญชีนี้ยังไม่ใช่แอดมิน</p>
                <p className="mt-2 text-amber-900/90">
                  <strong>วิธีที่ 1 — ยังไม่เคยสมัคร:</strong> ที่{" "}
                  <code className="rounded bg-white/80 px-1">huajaiy-api</code> → Environment ใส่{" "}
                  <code className="rounded bg-white/80 px-1">BOOTSTRAP_ADMIN_USERNAME</code> (ชื่อล็อกอิน),{" "}
                  <code className="rounded bg-white/80 px-1">BOOTSTRAP_ADMIN_PASSWORD</code> (รหัสที่ต้องการ),{" "}
                  <code className="rounded bg-white/80 px-1">BOOTSTRAP_ADMIN_PHONE</code> (เบอร์ 10 หลัก 0xxxxxxxxx)
                  → Deploy → ล็อกอินด้วย username/รหัสนั้น → แล้ว<strong>ลบ env ทั้งสามทิ้ง</strong>
                </p>
                <p className="mt-2 text-amber-900/90">
                  <strong>วิธีที่ 2 — สมัครแล้ว:</strong>{" "}
                  <code className="rounded bg-white/80 px-1">PROMOTE_ADMIN_USERNAME</code> = ยูสเซอร์ที่สมัคร → Deploy
                  (ไม่เปลี่ยนรหัส — ใช้รหัสตอนสมัครล็อกอิน)
                </p>
                <p className="mt-2 text-amber-900/90">
                  หรือรัน SQL:{" "}
                  <code className="rounded bg-white/80 px-1 break-all">
                    UPDATE users SET role = &apos;admin&apos; WHERE username = &apos;...&apos;;
                  </code>
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
