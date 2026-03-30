"use client";

import Link from "next/link";
import GlossyHeartIcon from "./GlossyHeartIcon";
import { useHearts } from "./HeartsProvider";
import { useMemberAuth } from "./MemberAuthProvider";

export default function HeartsBadge() {
  const { user, loading: authLoading } = useMemberAuth();
  const { ready } = useHearts();

  if (user && !authLoading) {
    const pink = Number(user.pinkHeartsBalance ?? 0);
    const red = Number(user.redHeartsBalance ?? 0);
    const roomRows = Array.isArray(user.roomGiftRed) ? user.roomGiftRed : [];
    const roomRed = roomRows.reduce(
      (s, x) => s + Math.max(0, Math.floor(Number(x.balance) || 0)),
      0
    );
    return (
      <Link
        href="/account/my-hearts"
        className="inline-flex items-center gap-2 overflow-visible rounded-full border border-brand-200/95 bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-900 shadow-sm transition hover:border-brand-300 hover:bg-brand-100"
        title="หัวใจชมพู / แดงทั่วไป / แดงจากรหัสห้อง (ใช้เล่นเกมตามกติกา) — แตะเพื่อหัวใจของฉัน"
      >
        <span className="inline-flex items-center gap-0.5 tabular-nums" title="หัวใจชมพู">
          <span className="inline-flex overflow-visible [filter:drop-shadow(0_0_5px_rgba(216,43,125,0.95))_drop-shadow(0_0_14px_rgba(200,30,95,0.72))]">
            <GlossyHeartIcon tone="pink" className="h-4 w-4 shrink-0" />
          </span>
          {pink.toLocaleString("th-TH")}
        </span>
        <span className="text-slate-300" aria-hidden>
          |
        </span>
        <span
          className="inline-flex max-w-[9rem] flex-wrap items-center gap-x-0.5 tabular-nums sm:max-w-none"
          title="แดงทั่วไปในระบบ"
        >
          <span className="inline-flex overflow-visible [filter:drop-shadow(0_0_5px_rgba(233,29,53,0.98))_drop-shadow(0_0_16px_rgba(196,18,40,0.75))]">
            <GlossyHeartIcon tone="red" className="h-4 w-4 shrink-0" />
          </span>
          {red.toLocaleString("th-TH")}
          {roomRed > 0 ? (
            <span
              className="text-[10px] font-semibold leading-tight text-amber-900/90"
              title="แดงจากรหัสห้อง — ใช้เล่นเกมของเจ้าของรหัสหรือเกมที่เปิดรับ"
            >
              +ห้อง {roomRed.toLocaleString("th-TH")}
            </span>
          ) : null}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className="inline-flex items-center gap-2 overflow-visible rounded-full border border-brand-200/95 bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-900 shadow-sm transition hover:border-brand-300 hover:bg-brand-100"
      title="เข้าสู่ระบบเพื่อดูยอดหัวใจจากเซิร์ฟเวอร์"
    >
      {ready ? (
        <>
          <span className="inline-flex items-center gap-0.5 tabular-nums" title="หัวใจชมพู">
            <span className="inline-flex overflow-visible [filter:drop-shadow(0_0_5px_rgba(216,43,125,0.95))_drop-shadow(0_0_14px_rgba(200,30,95,0.72))]">
              <GlossyHeartIcon tone="pink" className="h-4 w-4 shrink-0" />
            </span>
            {(0).toLocaleString("th-TH")}
          </span>
          <span className="text-slate-300" aria-hidden>
            |
          </span>
          <span className="inline-flex items-center gap-0.5 tabular-nums" title="หัวใจแดง">
            <span className="inline-flex overflow-visible [filter:drop-shadow(0_0_5px_rgba(233,29,53,0.98))_drop-shadow(0_0_16px_rgba(196,18,40,0.75))]">
              <GlossyHeartIcon tone="red" className="h-4 w-4 shrink-0" />
            </span>
            {(0).toLocaleString("th-TH")}
          </span>
        </>
      ) : (
        <span className="tabular-nums text-brand-900">—</span>
      )}
    </Link>
  );
}
