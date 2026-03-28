"use client";

import Link from "next/link";
import AdminDashboard from "../../components/AdminDashboard";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { useMemberAuth } from "../../components/MemberAuthProvider";

export default function AdminPage() {
  const { user, loading } = useMemberAuth();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8">
        <h1 className="text-xl font-bold text-slate-900">แอดมิน</h1>
        <p className="mt-2 text-sm text-slate-600">
          ดูรายชื่อสมาชิก ค้นหา และจัดการคำขอเปลี่ยนชื่อ–นามสกุล (ต้องล็อกอินด้วยบัญชีที่มีบทบาท{" "}
          <strong>admin</strong>)
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
              ตั้งค่าในฐานข้อมูล PostgreSQL:{" "}
              <code className="rounded bg-white/80 px-1 break-all">
                UPDATE users SET role = &apos;admin&apos; WHERE username = &apos;your_username&apos;;
              </code>
            </p>
            <p className="mt-2 text-amber-900/90">
              ถ้าใช้ไฟล์ <code className="rounded bg-white/80 px-1">data/users.json</code> ให้แก้ฟิลด์{" "}
              <code className="rounded bg-white/80 px-1">role</code> เป็น{" "}
              <code className="rounded bg-white/80 px-1">&quot;admin&quot;</code> แล้วล็อกอินใหม่
            </p>
          </div>
        ) : (
          <div className="mt-8">
            <p className="mb-6 text-sm text-slate-700">
              สวัสดี <strong>{user.username}</strong>
            </p>
            <AdminDashboard />
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
