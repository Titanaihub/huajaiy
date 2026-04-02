"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { MEMBER_WORKSPACE_PATH } from "../lib/memberWorkspacePath";
import { useMemberAuth } from "./MemberAuthProvider";

/** /account/profile — พาไประบบสมาชิก TailAdmin (ลิงก์เดิมยังใช้ได้) */
export default function AccountProfileToWorkspaceRedirect() {
  const { user, loading } = useMemberAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(
        `/login/line?next=${encodeURIComponent(MEMBER_WORKSPACE_PATH)}`
      );
      return;
    }
    router.replace(MEMBER_WORKSPACE_PATH);
  }, [loading, user, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-100 text-sm text-slate-600">
      กำลังพาไประบบสมาชิก…
    </main>
  );
}
