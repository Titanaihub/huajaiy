"use client";

import Link from "next/link";
import HeartIcon from "./HeartIcon";
import { useHearts } from "./HeartsProvider";
import { useMemberAuth } from "./MemberAuthProvider";

export default function HeartsBadge() {
  const { user, loading: authLoading } = useMemberAuth();
  const { ready } = useHearts();

  if (user && !authLoading) {
    const pink = Number(user.pinkHeartsBalance ?? 0);
    const red = Number(user.redHeartsBalance ?? 0);
    return (
      <Link
        href="/account"
        className="inline-flex items-center gap-2 rounded-full border border-brand-200/95 bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-900 shadow-sm transition hover:border-brand-300 hover:bg-brand-100"
        title="หัวใจชมพูและแดงในระบบ — แตะเพื่อเปิดหลังบ้านสมาชิก"
      >
        <span className="inline-flex items-center gap-0.5 tabular-nums" title="หัวใจชมพู">
          <HeartIcon className="h-3.5 w-3.5 shrink-0 text-rose-700" aria-hidden />
          {pink.toLocaleString("th-TH")}
        </span>
        <span className="text-slate-300" aria-hidden>
          |
        </span>
        <span className="inline-flex items-center gap-0.5 tabular-nums" title="หัวใจแดง">
          <HeartIcon className="h-3.5 w-3.5 shrink-0 text-red-800" aria-hidden />
          {red.toLocaleString("th-TH")}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className="inline-flex items-center gap-2 rounded-full border border-brand-200/95 bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-900 shadow-sm transition hover:border-brand-300 hover:bg-brand-100"
      title="เข้าสู่ระบบเพื่อดูยอดหัวใจจากเซิร์ฟเวอร์"
    >
      {ready ? (
        <>
          <span className="inline-flex items-center gap-0.5 tabular-nums" title="หัวใจชมพู">
            <HeartIcon className="h-3.5 w-3.5 shrink-0 text-rose-700" aria-hidden />
            {(0).toLocaleString("th-TH")}
          </span>
          <span className="text-slate-300" aria-hidden>
            |
          </span>
          <span className="inline-flex items-center gap-0.5 tabular-nums" title="หัวใจแดง">
            <HeartIcon className="h-3.5 w-3.5 shrink-0 text-red-800" aria-hidden />
            {(0).toLocaleString("th-TH")}
          </span>
        </>
      ) : (
        <span className="tabular-nums text-brand-900">—</span>
      )}
    </Link>
  );
}
