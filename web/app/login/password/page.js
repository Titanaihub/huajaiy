"use client";

import Link from "next/link";
import HomeStylePublicHeader from "../../../components/HomeStylePublicHeader";
import LoginForm from "../../../components/LoginForm";
import PublicLegalFooter from "../../../components/PublicLegalFooter";

export default function LoginPasswordPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <HomeStylePublicHeader authPage />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <h1 className="text-xl font-bold text-slate-900">เข้าสู่ระบบ</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          ใช้ <strong className="text-slate-800">ยูสเซอร์ + รหัสผ่าน</strong> หรือรหัสสมาชิก 6 หลัก
          — แอดมินและบัญชีที่ตั้งรหัสไว้เข้าทางนี้ได้
        </p>
        <p className="mt-3 text-xs text-slate-500">
          <Link href="/login" className="font-medium text-rose-600 underline underline-offset-2">
            กลับหน้าเลือกวิธีเข้า (แนะนำ LINE)
          </Link>
          <span className="text-slate-400"> · </span>
          <Link href="/" className="font-medium text-slate-700 underline underline-offset-2">
            หน้าแรก
          </Link>
        </p>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <LoginForm />
        </div>
      </main>
      <PublicLegalFooter />
    </div>
  );
}
