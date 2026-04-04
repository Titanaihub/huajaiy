"use client";

import Link from "next/link";
import { useMemberAuth } from "./MemberAuthProvider";

/**
 * เชลล์เฉพาะหน้าประวัติหัวใจ — แยกจาก SiteHeader / ฟุตเตอร์ / พื้นหลังธีมเดิมของหลังบ้าน
 */
export default function AccountHeartHistoryPageShell({ children }) {
  useMemberAuth();

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-[#f1f5f9] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 shadow-sm shadow-slate-900/5 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:py-3.5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link
              href="/member"
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800"
            >
              ← กลับสมาชิก
            </Link>
            <div className="min-w-0 border-l border-slate-200 pl-3">
              <p className="truncate text-xs font-medium uppercase tracking-wider text-slate-500">
                HUAJAIY
              </p>
              <p className="truncate text-sm font-bold text-slate-900">ประวัติหัวใจ</p>
            </div>
          </div>
          <nav className="flex shrink-0 items-center gap-2 text-sm">
            <Link
              href="/"
              className="rounded-lg px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              หน้าแรก
            </Link>
            <Link
              href="/member/hearts"
              className="rounded-lg px-3 py-1.5 font-medium text-rose-700 transition hover:bg-rose-50"
            >
              หัวใจแดงห้องเกม
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

      <footer className="mt-auto border-t border-slate-200/80 bg-white/80 py-4 text-center text-xs text-slate-500">
        <p>HUAJAIY · บันทึกจากเซิร์ฟเวอร์เมื่อมีการหักหรือเพิ่มหัวใจ</p>
      </footer>
    </div>
  );
}
