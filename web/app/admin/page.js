"use client";

import Link from "next/link";
import { useState } from "react";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { useMemberAuth } from "../../components/MemberAuthProvider";
import { getMemberToken } from "../../lib/memberApi";
import { apiAdminPing } from "../../lib/rolesApi";

export default function AdminPage() {
  const { user, loading } = useMemberAuth();
  const [ping, setPing] = useState(null);
  const [err, setErr] = useState("");

  async function runPing() {
    setErr("");
    setPing(null);
    try {
      const token = getMemberToken();
      if (!token) throw new Error("ไม่ได้เข้าสู่ระบบ");
      const data = await apiAdminPing(token);
      setPing(data);
    } catch (e) {
      setErr(e.message || String(e));
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8">
        <h1 className="text-xl font-bold text-slate-900">แอดมิน</h1>
        <p className="mt-2 text-sm text-slate-600">
          โครงสร้าง API: <code className="rounded bg-brand-50 px-1">GET /api/admin/ping</code>{" "}
          (ต้องมีบทบาท <strong>admin</strong>)
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">กำลังโหลด...</p>
        ) : !user ? (
          <p className="mt-6 text-sm">
            <Link href="/login" className="font-medium text-brand-800 underline">
              เข้าสู่ระบบ
            </Link>{" "}
            ก่อน
          </p>
        ) : user.role !== "admin" ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
            <p className="font-medium">บัญชีนี้ยังไม่ใช่แอดมิน</p>
            <p className="mt-2 text-amber-900/90">
              ตั้งค่าในฐานข้อมูล:{" "}
              <code className="rounded bg-white/80 px-1">
                {`UPDATE users SET role = 'admin' WHERE username = '...';`}
              </code>
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-slate-700">
              สวัสดี <strong>{user.username}</strong> — บทบาท:{" "}
              <span className="font-semibold text-brand-800">{user.role}</span>
            </p>
            <button
              type="button"
              onClick={() => runPing()}
              className="rounded-xl bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900"
            >
              ทดสอบ API แอดมิน
            </button>
            {err ? (
              <p className="text-sm text-red-600">{err}</p>
            ) : null}
            {ping ? (
              <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-800">
                {JSON.stringify(ping, null, 2)}
              </pre>
            ) : null}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
