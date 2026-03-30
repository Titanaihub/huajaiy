"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import InlineHeart from "./InlineHeart";
import { useMemberAuth } from "./MemberAuthProvider";

export default function AccountDashboardOverview() {
  const router = useRouter();
  const { user, loading, refresh } = useMemberAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/account");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <p className="text-sm text-slate-600" aria-live="polite">
        กำลังโหลด…
      </p>
    );
  }

  const pink = Number(user.pinkHeartsBalance ?? 0);
  const red = Number(user.redHeartsBalance ?? 0);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-slate-900">สวัสดี {user.firstName}</h2>
        <p className="mt-1 text-sm text-slate-600">
          @{user.username} · เบอร์ {user.phone}
        </p>
        <div className="mt-4 max-w-md">
          <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-rose-800/80">
              หัวใจชมพู (เซิร์ฟเวอร์)
            </p>
            <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-rose-900">
              <InlineHeart className="text-rose-400" />
              {pink.toLocaleString("th-TH")}
            </p>
            <p className="mt-2 text-xs font-semibold uppercase text-red-900/80">หัวใจแดง</p>
            <p className="mt-1 flex items-center gap-2 text-xl font-bold text-red-800">
              <InlineHeart className="text-red-600" />
              {red.toLocaleString("th-TH")}
            </p>
            <p className="mt-2 text-xs text-rose-900/70">
              รวม {(pink + red).toLocaleString("th-TH")} — มุมจออาจมีหัวใจสาธิตในเครื่องแยกต่างหาก
            </p>
            <button
              type="button"
              onClick={() => refresh()}
              className="mt-3 text-xs font-semibold text-rose-800 underline decoration-rose-300 underline-offset-2 hover:text-rose-950"
            >
              รีเฟรชยอด
            </button>
            <p className="mt-2">
              <Link
                href="/account/heart-history"
                className="text-xs font-semibold text-brand-800 underline decoration-brand-300 underline-offset-2 hover:text-brand-950"
              >
                ดูประวัติได้/หักหัวใจ
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
