"use client";

import Link from "next/link";
import BrandLogo from "./BrandLogo";

const linkClass =
  "text-sm font-medium text-slate-600 transition hover:text-rose-700 hover:underline underline-offset-2";

/**
 * ฟุตเตอร์แบบเบา — ใช้คู่กับ HomeStylePublicHeader บนหน้าสาธารณะ (เช่น /game)
 */
export default function OrganicPublicFooter() {
  return (
    <footer className="mt-auto shrink-0 border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <BrandLogo variant="footer" />
          <nav
            className="flex flex-wrap items-center gap-x-3 gap-y-1"
            aria-label="ลิงก์ท้ายหน้า"
          >
            <Link href="/privacy" className={linkClass}>
              นโยบายความเป็นส่วนตัว
            </Link>
            <span className="text-gray-300" aria-hidden>
              ·
            </span>
            <Link href="/terms" className={linkClass}>
              ข้อกำหนดการให้บริการ
            </Link>
            <span className="text-gray-300" aria-hidden>
              ·
            </span>
            <Link href="/data-deletion" className={linkClass}>
              การลบข้อมูล
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
