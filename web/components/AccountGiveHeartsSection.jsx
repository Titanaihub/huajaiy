"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AccountRoomRedGiftSection from "./AccountRoomRedGiftSection";
import { useMemberAuth } from "./MemberAuthProvider";

export default function AccountGiveHeartsSection() {
  const router = useRouter();
  const { user, loading } = useMemberAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/account/give-hearts");
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
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">แจกหัวใจแดง</h2>
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <Link
            href="/account/hearts-shop"
            className="font-semibold text-brand-800 underline decoration-brand-300 underline-offset-2 hover:text-brand-950"
          >
            ซื้อหัวใจแดง
          </Link>
          <Link
            href="/account/heart-history/purchases"
            className="font-semibold text-brand-800 underline decoration-brand-300 underline-offset-2 hover:text-brand-950"
          >
            ประวัติหัวใจแดง
          </Link>
          <Link
            href="/account/my-hearts"
            className="font-semibold text-brand-800 underline decoration-brand-300 underline-offset-2 hover:text-brand-950"
          >
            หัวใจของฉัน (มุมมองผู้เล่น)
          </Link>
        </p>
      </header>

      <AccountRoomRedGiftSection />
    </div>
  );
}
