"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

export default function AuthPage() {
  const { data: session, status } = useSession();
  const [authError, setAuthError] = useState("");

  async function handleSignIn(provider) {
    setAuthError("");
    const result = await signIn(provider, { callbackUrl: "/auth", redirect: false });
    if (result?.error) {
      setAuthError(
        "เข้าสู่ระบบไม่สำเร็จ ตรวจสอบ LINE Channel ID/Secret และ Callback URL"
      );
    } else if (result?.url) {
      window.location.href = result.url;
    }
  }

  return (
    <>
      <SiteHeader />
    <main className="mx-auto w-full max-w-md px-4 py-8">
      <Link href="/" className="text-sm font-medium text-hui-cta underline decoration-hui-cta/40">
        ← กลับหน้าแรก
      </Link>
      <h1 className="hui-h2 mt-4">เข้าด้วย LINE</h1>
      <p className="mt-2 text-base text-hui-body">
        แบบนี้ใช้ <strong className="text-hui-section">NextAuth</strong> แยกจากสมาชิกแบบยูสเซอร์/รหัสผ่านของเว็บ
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-base text-hui-body">
        <li>
          สมาชิกแบบยูส/รหัสผ่าน →{" "}
          <Link href="/register" className="font-medium text-hui-cta underline decoration-hui-cta/40">
            สมัคร
          </Link>{" "}
          /{" "}
          <Link href="/login" className="font-medium text-hui-cta underline decoration-hui-cta/40">
            เข้าสู่ระบบ
          </Link>
        </li>
        <li>
          ตั้งค่า LINE + env บน Render ตาม{" "}
          <code className="rounded border border-hui-border bg-hui-pageTop px-1 text-sm">web/.env.example</code>
        </li>
      </ol>

      <div className="mt-6 rounded-2xl border border-hui-border bg-hui-surface p-4 shadow-soft">
        {status === "loading" ? (
          <p className="text-sm text-hui-muted">กำลังตรวจสอบเซสชัน...</p>
        ) : status === "authenticated" && session?.user ? (
          <div className="flex items-center gap-3">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt=""
                className="h-10 w-10 rounded-full border border-hui-border"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{session.user.name}</p>
              <p className="truncate text-xs text-hui-muted">{session.provider}</p>
            </div>
            <button
              type="button"
              className="rounded-xl border border-hui-border bg-white px-2 py-1 text-xs text-hui-body"
              onClick={() => signOut()}
            >
              ออก
            </button>
          </div>
        ) : (
          <div className="grid gap-2">
            <button
              type="button"
              className="rounded-xl bg-[#06C755] px-3 py-2 text-sm font-semibold text-white"
              onClick={() => handleSignIn("line")}
            >
              LINE
            </button>
            <p className="text-xs text-hui-muted">TikTok — รอตั้งค่าในรอบถัดไป</p>
          </div>
        )}
        {authError ? <p className="mt-2 text-xs text-red-600">{authError}</p> : null}
      </div>
    </main>
      <SiteFooter />
    </>
  );
}
