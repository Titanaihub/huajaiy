"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import HomeLandingFigmaShell from "./HomeLandingFigmaShell";
import OrganicPublicFooter from "./OrganicPublicFooter";
import { useMemberAuth } from "./MemberAuthProvider";

const IFRAME_HEIGHT_INITIAL = 960;

/**
 * หน้าแรก production: แถบโปรโม + เมนู + Hero (Next — HomeLandingFigmaShell)
 * + iframe organic (?huajaiy_chrome=1) ส่งความสูงเอกสารจริง → เลื่อนทั้งหน้า สกอร์บาร์เดียว ฟุตเตอร์ท้ายเนื้อหา
 */
export default function HomeOrganicChrome() {
  const iframeRef = useRef(null);
  const { user } = useMemberAuth();
  const [iframePxHeight, setIframePxHeight] = useState(IFRAME_HEIGHT_INITIAL);

  useEffect(() => {
    function onMessage(ev) {
      if (ev.origin !== window.location.origin) return;
      const d = ev.data;
      if (!d || d.type !== "HUAJAIY_ORGANIC_DOC_HEIGHT") return;
      const h = Number(d.height);
      if (!Number.isFinite(h) || h < 240) return;
      setIframePxHeight(Math.min(Math.ceil(h), 32000));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

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
    <div className="flex w-full flex-col bg-white">
      <HomeLandingFigmaShell
        onHamburgerClick={toggleOrganicNav}
        lineProfileImageUrl={user?.linePictureUrl || undefined}
        profileDisplayName={
          user
            ? [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
              "สมาชิก"
            : undefined
        }
      />
      <main className="w-full bg-slate-100">
        <iframe
          ref={iframeRef}
          title="หน้าแรก — HUAJAIY"
          src="/organic-template/index.html?huajaiy_chrome=1"
          className="block w-full max-w-full border-0"
          style={{ height: iframePxHeight }}
          scrolling="no"
        />
      </main>
      <OrganicPublicFooter />
    </div>
  );
}
