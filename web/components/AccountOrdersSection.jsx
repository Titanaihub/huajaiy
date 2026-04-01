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
      <p className="text-sm text-hui-body" aria-live="polite">
        กำลังโหลด…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-hui-section">ออเดอร์ของฉัน</h2>
      <p className="text-sm text-hui-body">
        ออเดอร์ที่บันทึกในบัญชีของคุณหลังล็อกอินและยืนยันตะกร้า — หากมีประวัติทดลองในเครื่องจะแสดงแยกด้านล่าง
      </p>
      <OrdersList />
      <p className="text-sm text-hui-body">
        <Link href="/cart" className="text-hui-cta underline hover:brightness-95">
          ไปตะกร้า
        </Link>
      </p>
    </div>
  );
}
