"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import OrdersList from "./OrdersList";
import { useMemberAuth } from "./MemberAuthProvider";

export default function AccountOrdersSection() {
  const router = useRouter();
  const { user, loading } = useMemberAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/account/orders");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <p className="text-sm text-slate-600" aria-live="polite">
        กำลังโหลด…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">ออเดอร์ของฉัน</h2>
      <p className="text-sm text-slate-600">
        ออเดอร์ที่บันทึกในบัญชีของคุณหลังล็อกอินและยืนยันตะกร้า — หากมีประวัติทดลองในเครื่องจะแสดงแยกด้านล่าง
      </p>
      <OrdersList />
      <p className="text-sm text-slate-600">
        <Link href="/cart" className="text-brand-800 underline hover:text-brand-950">
          ไปตะกร้า
        </Link>
      </p>
    </div>
  );
}
