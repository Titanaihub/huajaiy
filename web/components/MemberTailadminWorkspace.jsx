"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { MEMBER_WORKSPACE_PATH } from "../lib/memberWorkspacePath";
import { useMemberAuth } from "./MemberAuthProvider";

const IFRAME_SRC = "/tailadmin-template/";

export default function MemberTailadminWorkspace() {
  const { user, loading } = useMemberAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(
        `/login/line?next=${encodeURIComponent(MEMBER_WORKSPACE_PATH)}`
      );
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-100 text-sm text-slate-600">
        กำลังโหลด…
      </main>
    );
  }

  return (
    <main className="h-dvh min-h-0 w-full overflow-hidden bg-slate-100">
      <iframe
        title="ระบบสมาชิก — TailAdmin"
        src={IFRAME_SRC}
        className="h-full w-full border-0"
      />
    </main>
  );
}
