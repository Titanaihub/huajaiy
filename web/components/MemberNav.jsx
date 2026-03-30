"use client";

import Link from "next/link";
import { showMemberShopNav } from "../lib/memberUi";
import { useMemberAuth } from "./MemberAuthProvider";

export default function MemberNav() {
  const { user, loading, logout } = useMemberAuth();

  if (loading) {
    return (
      <span className="text-xs font-medium text-slate-400" aria-live="polite">
        …
      </span>
    );
  }

  if (user) {
    const label = `${user.firstName} ${user.lastName}`.trim() || user.username;
    return (
      <span className="flex flex-wrap items-center gap-2 text-sm">
        <span className="max-w-[140px] truncate text-sm font-medium text-slate-800" title={label}>
          {label}
        </span>
        <Link
          href="/account"
          className="font-medium text-brand-700 transition hover:text-brand-900"
        >
          หลังบ้าน
        </Link>
        <Link
          href="/account/prizes"
          className="font-medium text-brand-700 transition hover:text-brand-900"
          title="รางวัลจากเกมส่วนกลาง"
        >
          รางวัลของฉัน
        </Link>
        <Link
          href="/admin"
          className="font-medium text-brand-700 transition hover:text-brand-900"
          title="เกมส่วนกลาง — แก้ไขได้เมื่อเป็นแอดมิน"
        >
          สร้างเกม
        </Link>
        <Link
          href="/account/prize-payouts"
          className="font-medium text-brand-700 transition hover:text-brand-900"
          title="รายการผู้ได้รางวัล — ใช้งานเต็มรูปแบบเมื่อเป็นแอดมิน"
        >
          จ่ายรางวัล
        </Link>
        <Link
          href="/account/profile"
          className="font-medium text-brand-700 transition hover:text-brand-900"
        >
          ข้อมูลส่วนตัว
        </Link>
        {showMemberShopNav(user) ? (
          <Link
            href="/account/shops"
            className="font-medium text-brand-700 transition hover:text-brand-900"
            title="ลงสินค้า จัดการร้าน"
          >
            ร้านของฉัน
          </Link>
        ) : null}
        {user.role === "admin" ? (
          <Link
            href="/admin"
            className="font-medium text-brand-700 transition hover:text-brand-900"
          >
            แอดมิน
          </Link>
        ) : null}
        {user.role === "owner" || user.role === "admin" ? (
          <Link
            href="/owner"
            className="font-medium text-brand-700 transition hover:text-brand-900"
          >
            เจ้าของร้าน
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => logout()}
          className="text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-brand-800"
        >
          ออกจากระบบ
        </button>
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      <Link
        href="/register"
        className="font-medium text-slate-600 transition hover:text-brand-800"
      >
        สมัครสมาชิก
      </Link>
      <span className="text-slate-300">|</span>
      <Link
        href="/login"
        className="font-medium text-slate-600 transition hover:text-brand-800"
      >
        เข้าสู่ระบบ
      </Link>
    </span>
  );
}
