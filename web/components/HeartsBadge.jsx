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
    const giveaway = Math.max(0, Math.floor(Number(user.redGiveawayBalance) || 0));
    const roomRows = Array.isArray(user.roomGiftRed) ? user.roomGiftRed : [];
    const roomRed = roomRows.reduce(
      (s, x) => s + Math.max(0, Math.floor(Number(x.balance) || 0)),
      0
    );
    return (
      <Link
        href="/account/my-hearts"
        className="inline-flex items-center gap-2 overflow-visible rounded-full border border-brand-200/95 bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-900 shadow-sm transition hover:border-brand-300 hover:bg-brand-100"
        title="หัวใจชมพู / แดงจากรหัสห้อง / แดงแจก · แตะเพื่อหัวใจของฉัน"
      >
        <span className="inline-flex items-center gap-0.5 tabular-nums" title="หัวใจชมพู">
          <GlossyHeartIcon tone="pink" className="heart-logo-blink h-4 w-4 shrink-0 text-rose-700" />
          {pink.toLocaleString("th-TH")}
        </span>
        <span className="text-slate-300" aria-hidden>
          |
        </span>
        <span
          className="inline-flex max-w-[9rem] flex-wrap items-center gap-x-0.5 tabular-nums sm:max-w-none"
          title="แดงจากรหัสห้อง / แดงแจก"
        >
          <GlossyHeartIcon tone="red" className="heart-logo-blink h-4 w-4 shrink-0 text-red-700" />
          {roomRed.toLocaleString("th-TH")}
          {giveaway > 0 ? (
            <span
              className="text-[10px] font-semibold leading-tight text-rose-900/95"
              title="แดงแจก — ใช้สร้างรหัสให้ผู้เล่น (เมนูแจกหัวใจแดง)"
            >
              +แจก {giveaway.toLocaleString("th-TH")}
            </span>
          ) : null}
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
            <GlossyHeartIcon tone="pink" className="heart-logo-blink h-4 w-4 shrink-0 text-rose-700" />
            {(0).toLocaleString("th-TH")}
          </span>
          <span className="text-slate-300" aria-hidden>
            |
          </span>
          <span className="inline-flex items-center gap-0.5 tabular-nums" title="หัวใจแดงจากรหัสห้อง">
            <GlossyHeartIcon tone="red" className="heart-logo-blink h-4 w-4 shrink-0 text-red-700" />
            {(0).toLocaleString("th-TH")}
          </span>
        </>
      ) : (
        <span className="tabular-nums text-brand-900">—</span>
      )}
    </Link>
  );
}
