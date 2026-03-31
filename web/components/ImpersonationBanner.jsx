"use client";

import { useMemberAuth } from "./MemberAuthProvider";

export default function ImpersonationBanner() {
  const { impersonation, exitImpersonation, user } = useMemberAuth();

  if (!impersonation || !user) return null;

  const adminLabel = impersonation.adminUsername
    ? `@${impersonation.adminUsername}`
    : "แอดมิน";

  return (
    <div
      className="border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-sm text-amber-950"
      role="status"
    >
      <span className="font-semibold">โหมดตรวจสอบ:</span> คุณกำลังดูระบบในนาม{" "}
      <span className="font-mono font-semibold">@{user.username}</span>
      <span className="mx-1 text-amber-900/80">·</span>
      <span className="text-xs text-amber-900/90">เปิดโดย {adminLabel}</span>
      <button
        type="button"
        onClick={() => exitImpersonation()}
        className="ml-3 rounded-md border border-amber-700 bg-white px-2 py-0.5 text-xs font-semibold text-amber-950 hover:bg-amber-50"
      >
        ออกจากโหมดนี้ (กลับแอดมิน)
      </button>
    </div>
  );
}
