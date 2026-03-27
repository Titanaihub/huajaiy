"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMemberAuth } from "./MemberAuthProvider";

export default function RegisterForm() {
  const router = useRouter();
  const { register } = useMemberAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({
        firstName,
        lastName,
        phone,
        username,
        password,
        passwordConfirm
      });
      router.push("/");
    } catch (err) {
      setError(err.message || "สมัครไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900">สมัครสมาชิก</h1>
      <p className="mt-2 text-sm text-slate-600">
        ชื่อ–นามสกุลเป็นภาษาไทยเท่านั้น · เบอร์โทร 10 หลัก · ชื่อผู้ใช้ภาษาอังกฤษตัวเล็ก
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-slate-700">
            ชื่อ (ภาษาไทย)
          </label>
          <input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            required
            autoComplete="given-name"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-slate-700">
            นามสกุล (ภาษาไทย)
          </label>
          <input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            required
            autoComplete="family-name"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
            เบอร์โทรศัพท์
          </label>
          <input
            id="phone"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="0812345678"
            required
            autoComplete="tel"
          />
        </div>
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-slate-700">
            ชื่อผู้ใช้ (a–z, ตัวเลข, _)
          </label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            required
            autoComplete="username"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            รหัสผ่าน (อย่างน้อย 6 ตัว)
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            required
            autoComplete="new-password"
          />
        </div>
        <div>
          <label htmlFor="passwordConfirm" className="block text-sm font-medium text-slate-700">
            ยืนยันรหัสผ่าน
          </label>
          <input
            id="passwordConfirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            required
            autoComplete="new-password"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "กำลังส่ง..." : "สมัครสมาชิก"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        มีบัญชีแล้ว?{" "}
        <Link href="/login" className="text-blue-600 underline">
          เข้าสู่ระบบ
        </Link>
      </p>
    </>
  );
}
