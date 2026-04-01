"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMemberAuth } from "./MemberAuthProvider";

export default function LoginForm({ redirectAfterLogin = null }) {
  const router = useRouter();
  const { login } = useMemberAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
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

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
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
