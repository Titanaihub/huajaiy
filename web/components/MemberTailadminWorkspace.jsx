"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { getApiBase } from "../lib/config";
import { MEMBER_WORKSPACE_PATH } from "../lib/memberWorkspacePath";
import { useMemberAuth } from "./MemberAuthProvider";
import SiteHeader from "./SiteHeader";

const IFRAME_SRC = "/tailadmin-template/";

export default function MemberTailadminWorkspace() {
  const { user, loading } = useMemberAuth();
  const router = useRouter();
  const iframeRef = useRef(null);

  const pushMemberToIframe = useCallback(() => {
    const w = iframeRef.current?.contentWindow;
    if (!w || !user) return;
    try {
      w.postMessage(
        {
          type: "HUAJAIY_MEMBER",
          apiBase: getApiBase(),
          user
        },
        window.location.origin
      );
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(
        `/login/line?next=${encodeURIComponent(MEMBER_WORKSPACE_PATH)}`
      );
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
    <>
      <SiteHeader />
      <main className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-slate-100">
        <iframe
          ref={iframeRef}
          title="ระบบสมาชิก HUAJAIY"
          src={IFRAME_SRC}
          className="min-h-0 w-full flex-1 border-0"
          onLoad={pushMemberToIframe}
        />
      </main>
    </>
  );
}
