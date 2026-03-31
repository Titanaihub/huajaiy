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
          <label htmlFor="login-username" className="block text-sm font-medium text-white">
            ชื่อผู้ใช้
          </label>
          <input
            id="login-username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            required
            autoComplete="username"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-white">
            รหัสผ่าน
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            required
            autoComplete="current-password"
          />
        </div>
        {error ? (
          <p className="rounded-lg bg-black/25 px-3 py-2 text-sm text-amber-100 ring-1 ring-white/20">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-800 py-3 text-sm font-semibold text-white hover:bg-brand-900 disabled:opacity-60"
        >
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-white/95">
        ยังไม่มีบัญชี?{" "}
        <Link href="/register" className="font-semibold text-white underline decoration-white/70 underline-offset-2 hover:decoration-white">
          สมัครสมาชิก
        </Link>
      </p>
    </>
  );
}
