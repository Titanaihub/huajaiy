"use client";

import { useCallback, useRef } from "react";
import HomeStylePublicHeader from "./HomeStylePublicHeader";
import { useMemberAuth } from "./MemberAuthProvider";

/**
 * หน้าแรก: หัวเว็บเดียวกับ /member /admin (สถานะล็อกอินจาก MemberAuthProvider)
 * + iframe เทมเพลต organic แบบซ่อนแถบด้านใน (?huajaiy_chrome=1)
 */
export default function HomeOrganicChrome() {
  const iframeRef = useRef(null);
  const { user } = useMemberAuth();

  const toggleOrganicNav = useCallback(() => {
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    try {
      w.postMessage({ type: "HUAJAIY_TOGGLE_ORGANIC_NAV" }, window.location.origin);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-white">
      <HomeStylePublicHeader
        onHamburgerClick={toggleOrganicNav}
        lineProfileImageUrl={user?.linePictureUrl || undefined}
        profileDisplayName={
          user
            ? [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
              "สมาชิก"
            : undefined
        }
      />
      <main className="min-h-0 flex-1 overflow-hidden bg-slate-100">
        <iframe
          ref={iframeRef}
          title="หน้าแรก — HUAJAIY"
          src="/organic-template/index.html?huajaiy_chrome=1"
          className="h-full w-full border-0"
        />
      </main>
    </div>
  );
}
