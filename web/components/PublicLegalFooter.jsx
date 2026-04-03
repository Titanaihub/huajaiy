"use client";

import Link from "next/link";

/** ฟุตเตอร์บางๆ แบบหน้า public — ไม่ผูก SiteTheme / SiteHeader เก่า */
export default function PublicLegalFooter() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white py-4 text-sm text-gray-600">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-semibold text-gray-900">HUAJAIY</span>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <span className="text-gray-500">กฎหมาย</span>
          <Link href="/privacy" className="text-gray-800 underline decoration-gray-300 underline-offset-2 hover:text-rose-600">
            นโยบายความเป็นส่วนตัว
          </Link>
          <Link href="/terms" className="text-gray-800 underline decoration-gray-300 underline-offset-2 hover:text-rose-600">
            ข้อกำหนดการให้บริการ
          </Link>
          <Link href="/data-deletion" className="text-gray-800 underline decoration-gray-300 underline-offset-2 hover:text-rose-600">
            การลบข้อมูล
          </Link>
        </div>
      </div>
    </footer>
  );
}
