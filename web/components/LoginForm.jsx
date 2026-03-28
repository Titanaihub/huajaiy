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
      <h1 className="text-xl font-semibold text-slate-900">เข้าสู่ระบบ</h1>
      <p className="mt-2 text-sm text-slate-600">ใช้ชื่อผู้ใช้และรหัสผ่านที่สมัครไว้</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="login-username" className="block text-sm font-medium text-slate-700">
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
          <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
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
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-800 py-3 text-sm font-semibold text-white hover:bg-brand-900 disabled:opacity-60"
        >
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        ยังไม่มีบัญชี?{" "}
        <Link href="/register" className="text-blue-600 underline">
          สมัครสมาชิก
        </Link>
      </p>
    </>
  );
}
