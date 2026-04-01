"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";
import { clearMemberToken, setMemberToken } from "../../../lib/memberApi";
import { siteNavLinkClass } from "../../../lib/siteNavLinkClass";
import { safeRedirectPath } from "../../../lib/safeRedirectPath";

const NEXT_AUTH_ERROR_TH = {
  Configuration: "การตั้งค่า NextAuth ไม่สมบูรณ์ — ตรวจสอบ NEXTAUTH_URL / NEXTAUTH_SECRET",
  AccessDenied: "ถูกปฏิเสธการเข้าถึง",
  Verification: "ลิงก์หมดอายุหรือถูกใช้แล้ว",
  OAuthSignin: "เริ่มล็อกอิน OAuth ไม่สำเร็จ",
  OAuthCallback:
    "LINE ตอบกลับไม่สำเร็จ — ตรวจสอบ Callback URL ใน LINE ให้เป็น …/api/auth/callback/line",
  OAuthCreateAccount: "สร้างบัญชีไม่สำเร็จ",
  Callback: "Callback ผิดพลาด",
  OAuthAccountNotLinked: "บัญชี LINE ยังไม่ได้ผูกกับระบบ",
  Default: "เข้าสู่ระบบไม่สำเร็จ"
};

/** หลังล็อกอินแล้วจะพาไป path นี้ — รองรับ ?next= และ ?callbackUrl= จาก NextAuth */
function resolveMemberRedirect(searchParams) {
  const direct = safeRedirectPath(searchParams.get("next"));
  if (direct) return direct;
  const cb = searchParams.get("callbackUrl");
  if (!cb) return "/account";
  try {
    const raw = decodeURIComponent(cb);
    const u = new URL(raw);
    const inner = safeRedirectPath(u.searchParams.get("next"));
    if (inner) return inner;
    const pathOnly = safeRedirectPath(u.pathname);
    if (pathOnly) return pathOnly;
  } catch {
    /* ignore */
  }
  return "/account";
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

  const callbackUrl = useMemo(
    () => resolveMemberRedirect(searchParams),
    [searchParams]
  );

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
        const data = await res.json().catch(() => ({}));
        if (ac.signal.aborted) return;
        if (!res.ok || !data.ok) {
          setMemberLinkError(data.error || "เชื่อมบัญชีสมาชิกไม่สำเร็จ");
          return;
        }
        setMemberToken(data.token);
        window.location.assign(callbackUrl);
      } catch (e) {
        if (e.name === "AbortError") return;
        if (!ac.signal.aborted) {
          setMemberLinkError("เครือข่ายผิดพลาด — ลองอีกครั้ง");
        }
      }
    })();
    return () => ac.abort();
  }, [status, session, callbackUrl, exchangeRetry]);

  async function handleLineSignIn() {
    setAuthError("");
    const returnTo = `/login/line?next=${encodeURIComponent(callbackUrl)}`;
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
  }

  function handleSignOutLine() {
    clearMemberToken();
    signOut({ callbackUrl: "/login/line" });
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-md px-4 py-8">
        <Link href="/login" className={siteNavLinkClass}>
          ← กลับหน้าเข้าสู่ระบบ (ยูสเซอร์ / รหัสผ่าน)
        </Link>

        <h1 className="hui-h2 mt-6">เข้าสู่ระบบด้วย LINE</h1>
        <p className="mt-2 text-base leading-relaxed text-hui-body">
          ใช้บัญชี LINE ยืนยันตัวตน แล้วระบบจะสร้างหรือผูกบัญชีสมาชิกให้อัตโนมัติ (ต้องมี PostgreSQL และตั้ง{" "}
          <code className="rounded bg-hui-pageTop px-1 text-xs">LINE_LINK_SECRET</code> บนเว็บและ API)
        </p>

        <div className="mt-6 rounded-2xl border border-hui-border bg-hui-surface/95 p-5 shadow-soft">
          {status === "loading" ? (
            <p className="text-sm text-hui-muted">กำลังตรวจสอบเซสชัน...</p>
          ) : status === "authenticated" && session?.user ? (
            isLineSession(session) ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {session.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-full border border-hui-border object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-hui-border bg-hui-pageTop text-sm font-semibold text-hui-section"
                      aria-hidden
                    >
                      LINE
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-hui-section">{session.user.name}</p>
                    <p className="truncate text-sm text-hui-muted">ยืนยัน LINE แล้ว</p>
                  </div>
                </div>
                {memberLinkError ? (
                  <>
                    <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                      {memberLinkError}
                    </p>
                    <button
                      type="button"
                      className="hui-btn-primary w-full py-2.5 text-sm"
                      onClick={() => setExchangeRetry((n) => n + 1)}
                    >
                      ลองเชื่อมบัญชีอีกครั้ง
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-hui-muted">
                    กำลังเชื่อมกับบัญชีสมาชิกและพาไปยังหน้าเป้าหมาย...
                  </p>
                )}
                <button
                  type="button"
                  className="w-full rounded-2xl border border-hui-border bg-white px-4 py-2.5 text-sm font-semibold text-hui-body hover:bg-hui-pageTop"
                  onClick={handleSignOutLine}
                >
                  ออกจาก LINE
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-hui-body">คุณเข้าสู่ระบบด้วยผู้ให้บริการอื่น</p>
                <button
                  type="button"
                  className="rounded-2xl border border-hui-border bg-white px-4 py-2 text-sm"
                  onClick={() => signOut({ callbackUrl: "/login/line" })}
                >
                  ออกจากระบบ
                </button>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleLineSignIn}
                className="w-full rounded-2xl bg-[#06C755] px-4 py-3.5 text-center text-base font-semibold text-white shadow-soft transition hover:brightness-95 active:scale-[0.99]"
              >
                เข้าสู่ระบบด้วย LINE
              </button>
              <p className="text-center text-sm text-hui-muted">
                ยังไม่มีบัญชีแบบยูสเซอร์/รหัสผ่าน?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
                >
                  สมัครสมาชิก
                </Link>
              </p>
            </div>
          )}
          {authError ? (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {authError}
            </p>
          ) : null}
        </div>

        <p className="mt-6 text-center text-sm text-hui-muted">
          <Link href="/" className={siteNavLinkClass}>
            หน้าแรก
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

function LineLoginFallback() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-md px-4 py-8">
        <p className="text-sm text-hui-muted">กำลังโหลด...</p>
      </main>
      <SiteFooter />
    </>
  );
}

export default function LineLoginPage() {
  return (
    <Suspense fallback={<LineLoginFallback />}>
      <LineLoginContent />
    </Suspense>
  );
}
