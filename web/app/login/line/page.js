"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import CentralAuthPageShell from "../../../components/CentralAuthPageShell";
import {
  LineLoginPinkPillInner,
  lineLoginPinkPillClassName
} from "../../../components/LineLoginPinkPill";
import {
  ADMIN_HOME_PATH,
  MEMBER_WORKSPACE_PATH
} from "../../../lib/memberWorkspacePath";
import { sanitizePostLoginNext } from "../../../lib/postLoginRedirect";
import { clearMemberToken, setMemberToken } from "../../../lib/memberApi";

const NEXT_AUTH_ERROR_TH = {
  Configuration: "การตั้งค่า NextAuth ไม่สมบูรณ์ — ตรวจสอบ NEXTAUTH_URL / NEXTAUTH_SECRET",
  AccessDenied: "ถูกปฏิเสธการเข้าถึง",
  Verification: "ลิงก์หมดอายุหรือถูกใช้แล้ว",
  OAuthSignin: "เริ่มล็อกอิน OAuth ไม่สำเร็จ",
  OAuthCallback:
    "แลกรหัสกับ LINE ไม่สำเร็จ — เช็ก Callback URL ใน LINE = …/api/auth/callback/line, NEXTAUTH_URL มี www ตรงกัน, และ LINE_CHANNEL_ID/SECRET เป็นของ channel เดียวกับที่ตั้ง Callback",
  OAuthCreateAccount: "สร้างบัญชีไม่สำเร็จ",
  Callback: "Callback ผิดพลาด",
  OAuthAccountNotLinked: "บัญชี LINE ยังไม่ได้ผูกกับระบบ",
  Default: "เข้าสู่ระบบไม่สำเร็จ"
};

function workspacePathAfterLineLink(user, nextParam) {
  const next = sanitizePostLoginNext(nextParam);
  if (user?.role === "admin") {
    if (next && String(next).startsWith("/admin")) return next;
    return ADMIN_HOME_PATH;
  }
  if (next) return next;
  return MEMBER_WORKSPACE_PATH;
}

function isLineSession(session) {
  if (!session?.user?.id) return false;
  if (session.provider === "line") return true;
  return /^U[A-Za-z0-9._-]{4,128}$/.test(String(session.user.id));
}

function LineLoginContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [authError, setAuthError] = useState("");
  const [memberLinkError, setMemberLinkError] = useState(null);
  const [exchangeRetry, setExchangeRetry] = useState(0);
  const autoStartLine = searchParams.get("auto") === "1";
  const lineAutoOnce = useRef(false);

  const passwordAltHref = useMemo(() => {
    const next = searchParams.get("next");
    const n = next && String(next).trim();
    if (n) return `/login/password?next=${encodeURIComponent(n)}`;
    return "/login/password";
  }, [searchParams]);

  useEffect(() => {
    const err = searchParams.get("error");
    if (!err) return;
    const msg = NEXT_AUTH_ERROR_TH[err] || NEXT_AUTH_ERROR_TH.Default;
    setAuthError((prev) => prev || msg);
  }, [searchParams]);

  useEffect(() => {
    if (status !== "authenticated" || !isLineSession(session)) {
      return undefined;
    }
    setMemberLinkError(null);
    const ac = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/auth/member-from-line", {
          method: "POST",
          signal: ac.signal
        });
        const raw = await res.text();
        let data = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          data = {
            error: raw
              ? raw.slice(0, 240)
              : `เซิร์ฟเวอร์ตอบ ${res.status} — ตรวจว่า API ทำงานและ NEXT_PUBLIC_API_BASE_URL ถูกต้อง`
          };
        }
        if (ac.signal.aborted) return;
        if (!res.ok || !data.ok) {
          const fromServer =
            typeof data.error === "string" && data.error.trim()
              ? data.error.trim()
              : "";
          setMemberLinkError(
            fromServer
              ? `${fromServer} · HTTP ${res.status}`
              : `แลกโทเค็นสมาชิกไม่สำเร็จ · HTTP ${res.status} — ดูรายละเอียดใน DevTools → Network → member-from-line → Response`
          );
          return;
        }
        setMemberToken(data.token);
        window.location.assign(
          workspacePathAfterLineLink(data.user, searchParams.get("next"))
        );
      } catch (e) {
        if (e.name === "AbortError") return;
        if (!ac.signal.aborted) {
          setMemberLinkError("เครือข่ายผิดพลาด — ลองอีกครั้ง");
        }
      }
    })();
    return () => ac.abort();
  }, [status, session, exchangeRetry, searchParams]);

  const handleLineSignIn = useCallback(async () => {
    setAuthError("");
    const returnTo = "/login/line";
    const result = await signIn("line", {
      callbackUrl: returnTo,
      redirect: false
    });
    if (result?.error) {
      setAuthError(
        "เข้าสู่ระบบไม่สำเร็จ — ตรวจสอบการตั้งค่า LINE Channel และ Callback URL ในเซิร์ฟเวอร์"
      );
    } else if (result?.url) {
      window.location.href = result.url;
    }
  }, []);

  useEffect(() => {
    if (!autoStartLine || authError) return;
    if (status !== "unauthenticated") return;
    if (lineAutoOnce.current) return;
    lineAutoOnce.current = true;
    handleLineSignIn();
  }, [autoStartLine, authError, status, handleLineSignIn]);

  function handleSignOutLine() {
    clearMemberToken();
    signOut({ callbackUrl: "/login/line" });
  }

  return (
    <CentralAuthPageShell>
      <div className="mx-auto w-full max-w-md px-4 py-8 sm:py-10">
        <h1 className="text-xl font-bold text-neutral-900">เข้าสู่ระบบ</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          แนะนำให้เข้าด้วยบัญชี LINE · สมาชิกใหม่สมัครผ่าน LINE เท่านั้น
        </p>

        <div className="mt-6 rounded-2xl border border-pink-100/90 bg-white/95 p-5 shadow-sm shadow-pink-100/30">
          {status === "loading" ? (
            <p className="text-sm text-slate-500">กำลังตรวจสอบเซสชัน...</p>
          ) : status === "authenticated" && session?.user ? (
            isLineSession(session) ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {session.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-full border border-slate-200 object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700"
                      aria-hidden
                    >
                      LINE
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{session.user.name}</p>
                    <p className="truncate text-sm text-slate-500">ยืนยัน LINE แล้ว</p>
                  </div>
                </div>
                {memberLinkError ? (
                  <>
                    <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                      {memberLinkError}
                    </p>
                    <button
                      type="button"
                      className="w-full rounded-xl bg-rose-500 py-2.5 text-sm font-semibold text-white hover:bg-rose-600"
                      onClick={() => setExchangeRetry((n) => n + 1)}
                    >
                      ลองเชื่อมบัญชีอีกครั้ง
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    กำลังเชื่อมบัญชีและพาไปหน้าสมาชิกหรือแอดมิน...
                  </p>
                )}
                <button
                  type="button"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={handleSignOutLine}
                >
                  ออกจาก LINE
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-700">คุณเข้าสู่ระบบด้วยผู้ให้บริการอื่น</p>
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
                  onClick={() => signOut({ callbackUrl: "/login/line" })}
                >
                  ออกจากระบบ
                </button>
              </div>
            )
          ) : (
            <div className="space-y-4">
              {autoStartLine && !authError ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  กำลังเปิด LINE เพื่อเข้าสู่ระบบ...
                </p>
              ) : (
                <>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleLineSignIn}
                      className={lineLoginPinkPillClassName}
                    >
                      <LineLoginPinkPillInner />
                    </button>
                  </div>
                  <p className="text-center text-sm text-neutral-500">
                    บัญชีจะถูกสร้างอัตโนมัติเมื่อเข้าด้วย LINE — ไม่ต้องสมัครล่วงหน้า
                  </p>
                </>
              )}
            </div>
          )}
          {authError ? (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              {authError}
            </p>
          ) : null}
        </div>

        <div className="mt-6 rounded-2xl border border-neutral-200/90 bg-white/90 p-4 shadow-sm">
          <p className="text-sm font-semibold text-neutral-900">ผู้ดูแลระบบ · เข้าด้วยรหัส</p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-600">
            แอดมินและบัญชีที่มีรหัสผ่าน — ใช้ยูสเซอร์ + รหัสผ่าน หรือรหัสสมาชิก 6 หลัก
          </p>
          <Link
            href={passwordAltHref}
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
          >
            เข้าสู่ระบบด้วยรหัสผ่านหรือรหัสสมาชิก
          </Link>
        </div>
      </div>
    </CentralAuthPageShell>
  );
}

function LineLoginFallback() {
  return (
    <CentralAuthPageShell>
      <div className="mx-auto w-full max-w-md px-4 py-10">
        <p className="text-sm text-neutral-500">กำลังโหลด...</p>
      </div>
    </CentralAuthPageShell>
  );
}

export default function LineLoginPage() {
  return (
    <Suspense fallback={<LineLoginFallback />}>
      <LineLoginContent />
    </Suspense>
  );
}
