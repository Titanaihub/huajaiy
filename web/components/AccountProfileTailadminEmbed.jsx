"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMemberAuth } from "./MemberAuthProvider";

const IFRAME_SRC = "/tailadmin-template/";

/**
 * โปรไฟล์สมาชิก = เปิดเทมเพลต TailAdmin (Vue) แบบเดียวกับ /theme-lab/tailadmin
 */
export default function AccountProfileTailadminEmbed() {
  const { user, loading } = useMemberAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(
        `/login/line?next=${encodeURIComponent("/account/profile")}`
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
        title="โปรไฟล์สมาชิก — TailAdmin"
        src={IFRAME_SRC}
        className="h-full w-full border-0"
      />
    </main>
  );
}
