"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import AdminDashboard from "../../../components/AdminDashboard";
import { useMemberAuth } from "../../../components/MemberAuthProvider";

function AdminPanelBody() {
  const router = useRouter();
  const { user, loading } = useMemberAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/hui/login?next=/admin");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-100 text-sm text-slate-600">
        กำลังโหลด…
      </main>
    );
  }

  if (user.role !== "admin") {
    return (
      <main className="mx-auto max-w-lg px-4 py-8">
        <p className="text-sm text-slate-700">บัญชีนี้ไม่มีสิทธิ์แอดมิน</p>
        <Link href="/admin" className="mt-4 inline-block text-sm font-medium text-blue-600 underline">
          กลับหน้าแอดมิน
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-100 px-3 py-4 sm:px-4">
      <Suspense fallback={<p className="text-sm text-slate-500">กำลังโหลดแผงแอดมิน…</p>}>
        <AdminDashboard />
      </Suspense>
    </div>
  );
}

export default function AdminPanelPage() {
  return <AdminPanelBody />;
}
