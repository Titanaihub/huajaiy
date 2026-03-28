"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AdminDashboard from "../../components/AdminDashboard";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { useMemberAuth } from "../../components/MemberAuthProvider";

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useMemberAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/admin");
    }
  }, [loading, user, router]);

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
          <p className="mt-6 text-sm text-slate-600">
            กำลังพาไปหน้าเข้าสู่ระบบ… หรือ{" "}
            <Link href="/login?next=/admin" className="font-medium text-brand-800 underline">
              กดที่นี่
            </Link>
          </p>
        ) : user.role !== "admin" ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
            <p className="font-medium">บัญชีนี้ยังไม่ใช่แอดมิน</p>
            <p className="mt-2 text-amber-900/90">
              <strong>วิธีที่ 1 — ยังไม่เคยสมัคร:</strong> ที่{" "}
              <code className="rounded bg-white/80 px-1">huajaiy-api</code> → Environment ใส่{" "}
              <code className="rounded bg-white/80 px-1">BOOTSTRAP_ADMIN_USERNAME</code> (ชื่อล็อกอิน),{" "}
              <code className="rounded bg-white/80 px-1">BOOTSTRAP_ADMIN_PASSWORD</code> (รหัสที่ต้องการ),{" "}
              <code className="rounded bg-white/80 px-1">BOOTSTRAP_ADMIN_PHONE</code> (เบอร์ 10 หลัก 0xxxxxxxxx)
              → Deploy → ล็อกอินด้วย username/รหัสนั้น → แล้ว<strong>ลบ env ทั้งสามทิ้ง</strong>
            </p>
            <p className="mt-2 text-amber-900/90">
              <strong>วิธีที่ 2 — สมัครแล้ว:</strong>{" "}
              <code className="rounded bg-white/80 px-1">PROMOTE_ADMIN_USERNAME</code> = ยูสเซอร์ที่สมัคร → Deploy
              (ไม่เปลี่ยนรหัส — ใช้รหัสตอนสมัครล็อกอิน)
            </p>
            <p className="mt-2 text-amber-900/90">
              หรือรัน SQL:{" "}
              <code className="rounded bg-white/80 px-1 break-all">
                UPDATE users SET role = &apos;admin&apos; WHERE username = &apos;...&apos;;
              </code>
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
