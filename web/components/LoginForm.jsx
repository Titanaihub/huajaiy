"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  isValidMemberLoginCode,
  sanitizeMemberLoginCodeInput
} from "../lib/memberLoginCode";
import { useMemberAuth } from "./MemberAuthProvider";

export default function LoginForm({ redirectAfterLogin = null }) {
  const router = useRouter();
  const { login } = useMemberAuth();
  const [mode, setMode] = useState("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [memberCode, setMemberCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmitPassword(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      router.push(redirectAfterLogin || "/");
    } catch (err) {
      setError(err.message || "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitCode(e) {
    e.preventDefault();
    setError("");
    const c = sanitizeMemberLoginCodeInput(memberCode);
    if (!isValidMemberLoginCode(c)) {
      setError(
        "รูปแบบรหัส: ตัวอักษร 2 หรือ 3 ตัวหน้า แล้วตามด้วยตัวเลข (1–9) รวม 6 หลัก — ไม่ใช้ 0 กับตัว o"
      );
      return;
    }
    setLoading(true);
    try {
      await login(c, c);
      router.push(redirectAfterLogin || "/");
    } catch (err) {
      setError(err.message || "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-hui-border bg-hui-pageTop/80 p-1 text-sm">
        <button
          type="button"
          className={`flex-1 rounded-xl px-3 py-2 font-medium transition ${
            mode === "password"
              ? "bg-white text-hui-section shadow-sm"
              : "text-hui-muted hover:text-hui-body"
          }`}
          onClick={() => {
            setMode("password");
            setError("");
          }}
        >
          ยูสเซอร์ + รหัสผ่าน
        </button>
        <button
          type="button"
          className={`flex-1 rounded-xl px-3 py-2 font-medium transition ${
            mode === "code"
              ? "bg-white text-hui-section shadow-sm"
              : "text-hui-muted hover:text-hui-body"
          }`}
          onClick={() => {
            setMode("code");
            setError("");
          }}
        >
          รหัสสมาชิก 6 หลัก
        </button>
      </div>

      {mode === "password" ? (
        <form onSubmit={onSubmitPassword} className="space-y-4">
          <div>
            <label htmlFor="login-username" className="hui-label">
              ชื่อผู้ใช้
            </label>
            <input
              id="login-username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="hui-input"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="hui-label">
              รหัสผ่าน
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="hui-input"
              required
              autoComplete="current-password"
            />
          </div>
          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="hui-btn-primary w-full py-3 text-center disabled:opacity-60"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      ) : (
        <form onSubmit={onSubmitCode} className="space-y-4">
          <p className="text-sm leading-relaxed text-hui-muted">
            สำหรับสมาชิกที่สร้างบัญชีผ่าน LINE — รหัสเดียวกับชื่อผู้ใช้ในหน้าโปรไฟล์
            รูปแบบ <strong>ตัวอักษร 2 หรือ 3 ตัวหน้า</strong> ตามด้วย <strong>ตัวเลข</strong> (รวม 6 หลัก) ไม่มี 0 กับตัว o
          </p>
          <div>
            <label htmlFor="login-member-code" className="hui-label">
              รหัสสมาชิก 6 หลัก
            </label>
            <input
              id="login-member-code"
              value={memberCode}
              onChange={(e) =>
                setMemberCode(sanitizeMemberLoginCodeInput(e.target.value))
              }
              className="hui-input font-mono text-lg tracking-widest"
              required
              minLength={6}
              maxLength={6}
              inputMode="text"
              autoComplete="username"
              placeholder="เช่น ab1234 หรือ abc123"
            />
          </div>
          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="hui-btn-primary w-full py-3 text-center disabled:opacity-60"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบด้วยรหัสนี้"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-hui-body">
        <Link
          href={redirectAfterLogin ? `/login/line?next=${encodeURIComponent(redirectAfterLogin)}` : "/login/line"}
          className="font-semibold text-[#06C755] underline decoration-[#06C755]/40 underline-offset-2 hover:brightness-95"
        >
          เข้าสู่ระบบด้วย LINE
        </Link>
      </p>
      <p className="mt-3 text-center text-sm text-hui-muted">
        บัญชีใหม่ไม่ต้องสมัคร — ใช้{" "}
        <Link
          href={redirectAfterLogin ? `/login/line?next=${encodeURIComponent(redirectAfterLogin)}` : "/login/line"}
          className="font-semibold text-[#06C755] underline decoration-[#06C755]/40 underline-offset-2 hover:brightness-95"
        >
          เข้าสู่ระบบด้วย LINE
        </Link>
      </p>
    </>
  );
}
