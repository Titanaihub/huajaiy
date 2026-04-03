"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { getApiBase } from "../lib/config";
import HomeStylePublicHeader from "./HomeStylePublicHeader";
import { useMemberAuth } from "./MemberAuthProvider";

/** เปิด TailAdmin ที่หน้าโปรไฟล์ (bridge อ่าน huajaiy_start) */
const IFRAME_SRC = "/tailadmin-template/?huajaiy_start=/profile";

/** พื้นที่สมาชิก production — หัวเว็บ + TailAdmin iframe */
export default function MemberTailadminWorkspace() {
  const { user, loading } = useMemberAuth();
  const router = useRouter();
  const iframeRef = useRef(null);

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
          ref={iframeRef}
          title="ระบบสมาชิก HUAJAIY"
          src={IFRAME_SRC}
          className="h-full w-full border-0"
          onLoad={pushMemberToIframe}
        />
      </main>
    </div>
  );
}
