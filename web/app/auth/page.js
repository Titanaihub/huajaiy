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
      <Link href="/" className="text-sm text-blue-600 underline">
        ← กลับหน้าแรก
      </Link>
      <h1 className="mt-4 text-lg font-semibold">เข้าด้วย LINE</h1>
      <p className="mt-2 text-sm text-slate-600">
        แบบนี้ใช้ <strong>NextAuth</strong> แยกจากสมาชิกแบบยูสเซอร์/รหัสผ่านของเว็บ
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-600">
        <li>
          สมาชิกแบบยูส/รหัสผ่าน →{" "}
          <Link href="/register" className="text-brand-800 underline">
            สมัคร
          </Link>{" "}
          /{" "}
          <Link href="/login" className="text-brand-800 underline">
            เข้าสู่ระบบ
          </Link>
        </li>
        <li>
          ตั้งค่า LINE + env บน Render ตาม{" "}
          <code className="rounded bg-slate-100 px-1">web/.env.example</code>
        </li>
      </ol>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        {status === "loading" ? (
          <p className="text-sm text-slate-500">กำลังตรวจสอบเซสชัน...</p>
        ) : status === "authenticated" && session?.user ? (
          <div className="flex items-center gap-3">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt=""
                className="h-10 w-10 rounded-full border border-slate-200"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{session.user.name}</p>
              <p className="truncate text-xs text-slate-500">{session.provider}</p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
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
            <p className="text-xs text-slate-500">TikTok — รอตั้งค่าในรอบถัดไป</p>
          </div>
        )}
        {authError ? <p className="mt-2 text-xs text-red-600">{authError}</p> : null}
      </div>
    </main>
      <SiteFooter />
    </>
  );
}
