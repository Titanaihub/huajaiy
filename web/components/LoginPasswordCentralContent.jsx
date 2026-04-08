"use client";

import Link from "next/link";
import CentralAuthPageShell from "./CentralAuthPageShell";
import LoginForm from "./LoginForm";

export default function LoginPasswordCentralContent() {
  return (
    <CentralAuthPageShell>
      <div className="mx-auto w-full max-w-md px-4 py-8 sm:py-10">
        <h1 className="text-xl font-bold text-neutral-900">เข้าสู่ระบบแบบอื่น</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          สำหรับ<strong className="font-semibold text-neutral-800">ผู้ดูแลระบบ (แอดมิน)</strong>
          และสมาชิกที่มีรหัส 6 หลัก — ใช้ยูสเซอร์ + รหัสผ่าน หรือรหัสสมาชิกตามแท็บด้านล่าง
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          ผู้ใช้ทั่วไปแนะนำให้กลับไปใช้ LINE
        </p>
        <div className="mt-6 rounded-2xl border border-pink-100/90 bg-white/95 p-5 shadow-sm shadow-pink-100/30">
          <LoginForm />
        </div>
        <p className="mt-8 text-center text-sm text-neutral-600">
          <Link
            href="/login/line"
            className="font-semibold text-[#06C755] underline decoration-[#06C755]/40 underline-offset-2 hover:brightness-95"
          >
            กลับ — เข้าสู่ระบบด้วย LINE
          </Link>
        </p>
      </div>
    </CentralAuthPageShell>
  );
}
