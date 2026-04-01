"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

/**
 * เดิมเป็นหน้า NextAuth — ตอนนี้ signIn page อยู่ที่ /login/line
 * ส่งต่อ query (callbackUrl, error ฯลฯ) เพื่อไม่ให้ลิงก์เก่าวนกลับมาที่นี่โดยไม่แลก JWT สมาชิก
 */
function AuthRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(qs ? `/login/line?${qs}` : "/login/line");
  }, [router, searchParams]);

  return (
    <p className="mx-auto max-w-md px-4 py-12 text-center text-sm text-hui-muted">
      กำลังไปหน้าเข้าสู่ระบบด้วย LINE…
    </p>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <p className="mx-auto max-w-md px-4 py-12 text-center text-sm text-hui-muted">
          กำลังโหลด…
        </p>
      }
    >
      <AuthRedirect />
    </Suspense>
  );
}
