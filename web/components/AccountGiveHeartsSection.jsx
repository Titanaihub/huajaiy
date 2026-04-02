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
      router.replace("/hui/login?next=/account/give-hearts");
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
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-hui-section">แจกหัวใจแดง</h2>
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
          <Link
            href="/account/hearts-shop"
            className="font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
          >
            ซื้อหัวใจแดง
          </Link>
          <Link
            href="/account/heart-history/purchases"
            className="font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
          >
            ประวัติหัวใจแดง
          </Link>
          <Link
            href="/account/my-hearts"
            className="font-semibold text-hui-section underline decoration-hui-border/80 underline-offset-2 hover:text-hui-cta"
          >
            หัวใจของฉัน (มุมมองผู้เล่น)
          </Link>
        </p>
      </header>

      <AccountRoomRedGiftSection />
    </div>
  );
}
