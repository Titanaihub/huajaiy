"use client";

import Link from "next/link";
import AdminPrizePayoutPanel from "./AdminPrizePayoutPanel";
import { useMemberAuth } from "./MemberAuthProvider";

export default function AccountPrizePayoutSection() {
  const { user, loading } = useMemberAuth();

  if (loading) {
    return <p className="text-sm text-hui-muted">กำลังโหลด…</p>;
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-950">
        <p className="font-semibold">เฉพาะผู้ดูแลระบบ</p>
        <p className="mt-2 text-amber-900">
          หน้านี้ใช้ดูรายการผู้ได้รับรางวัลและคำขอถอน — สมาชิกทั่วไปเห็นเมนูเพื่อทดสอบระบบ แต่ใช้งานแผงจ่ายรางวัลได้เมื่อเป็นแอดมินเท่านั้น
        </p>
        <Link href="/account" className="mt-3 inline-block text-sm font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta">
          กลับภาพรวมบัญชี
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-hui-section">จ่ายรางวัล</h2>
        <p className="mt-1 text-sm text-hui-body">
          รายการผู้เล่นที่ชนะรางวัลจากเกมส่วนกลาง (ตามที่ระบบบันทึก) — ใช้ตรวจสอบว่าต้องโอนเงิน ส่งของ หรือมอบบัตรกำนัลให้ใคร
        </p>
      </div>
      <AdminPrizePayoutPanel />
    </div>
  );
}
