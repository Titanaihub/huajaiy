"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { getApiBase } from "../lib/config";
import HomeStylePublicHeader from "./HomeStylePublicHeader";
import { useMemberAuth } from "./MemberAuthProvider";

const IFRAME_SRC = "/tailadmin-template/";

export default function AdminTailadminWorkspace() {
  const { user, loading } = useMemberAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const iframeRef = useRef(null);

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

  const pushAdminToIframe = useCallback(() => {
    if (!user || user.role !== "admin" || !panelUrl) return;
    postToIframe({ type: "HUAJAIY_MEMBER_CHROME" });
    postToIframe({
      type: "HUAJAIY_MEMBER",
      apiBase: getApiBase(),
      user
    });
    postToIframe({ type: "HUAJAIY_ADMIN_EMBED", url: panelUrl });
  }, [user, panelUrl, postToIframe]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/hui/login?next=/admin");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || user.role !== "admin" || !panelUrl) return;
    pushAdminToIframe();
  }, [user, panelUrl, pushAdminToIframe]);

  if (loading || !user) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-100 text-sm text-slate-600">
        กำลังโหลด…
      </main>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="flex min-h-dvh flex-col overflow-hidden bg-white">
        <HomeStylePublicHeader
          lineProfileImageUrl={user.linePictureUrl || undefined}
          profileDisplayName={
            [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
            user.username ||
            "สมาชิก"
          }
        />
        <main className="mx-auto w-full max-w-2xl flex-1 overflow-auto px-4 py-8">
          <h1 className="text-xl font-bold text-slate-900">แอดมิน</h1>
          <p className="mt-2 text-sm text-slate-600">
            พื้นที่นี้สำหรับบัญชีที่มีบทบาท <strong className="text-slate-800">admin</strong> เท่านั้น
          </p>
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
            <p className="font-medium">บัญชีนี้ยังไม่ใช่แอดมิน</p>
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
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-white">
      <HomeStylePublicHeader
        onHamburgerClick={toggleIframeSidebar}
        lineProfileImageUrl={user.linePictureUrl || undefined}
        profileDisplayName={
          [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
          user.username ||
          "แอดมิน"
        }
      />
      <main className="min-h-0 flex-1 overflow-hidden bg-slate-100">
        <iframe
          ref={iframeRef}
          title="ระบบแอดมิน HUAJAIY"
          src={IFRAME_SRC}
          className="h-full w-full border-0"
          onLoad={pushAdminToIframe}
        />
      </main>
    </div>
  );
}
