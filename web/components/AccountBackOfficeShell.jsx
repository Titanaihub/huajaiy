"use client";

import { useMemberAuth } from "./MemberAuthProvider";

export default function AccountBackOfficeShell({ children }) {
  const { user } = useMemberAuth();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-900">หลังบ้านสมาชิก</h1>
      {user ? (
        <p className="mt-1 text-sm text-slate-500">
          ใช้เมนู <strong className="text-slate-700">ผู้ใช้งาน</strong> /{" "}
          <strong className="text-slate-700">ผู้สร้าง</strong> ที่มุมขวาบน
        </p>
      ) : null}
      <div className="mt-8 min-w-0">{children}</div>
    </main>
  );
}
