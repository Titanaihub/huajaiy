"use client";

/**
 * แผงแอดมิน React (AdminDashboard) สำหรับฝังใน iframe จาก /admin
 * หน้านี้ตั้งใจไม่มีเชลล์หัวเว็บ — เพื่อไม่ซ้อนกับเทมเพลตที่ /admin
 */
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import AdminDashboard from "../../../../components/AdminDashboard";
import { useMemberAuth } from "../../../../components/MemberAuthProvider";

function AdminEmbedPanelBody() {
  const router = useRouter();
  const { user, loading } = useMemberAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?admin=1");
      return;
    }
    if (user.role !== "admin") {
      router.replace("/member");
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
      <main className="flex min-h-dvh items-center justify-center bg-slate-100 text-sm text-slate-600">
        กำลังเปลี่ยนเส้นทาง…
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

export default function AdminEmbedPanelPage() {
  return <AdminEmbedPanelBody />;
}
