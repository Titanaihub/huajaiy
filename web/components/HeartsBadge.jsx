"use client";

import Link from "next/link";
import GlossyHeartIcon from "./GlossyHeartIcon";
import { useHearts } from "./HeartsProvider";
import { useMemberAuth } from "./MemberAuthProvider";

const badgeBase =
  "inline-flex items-center gap-2 overflow-visible rounded-full px-2 py-1 text-xs font-semibold transition";
const badgeDefault =
  `${badgeBase} border border-slate-200 bg-white text-neutral-900 shadow-none hover:border-slate-300 hover:bg-slate-50`;
const badgeOnBrand =
  `${badgeBase} border border-white/35 bg-white/10 text-white hover:border-white/50 hover:bg-white/18`;

export default function HeartsBadge({ onBrand = false }) {
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
        className={onBrand ? badgeOnBrand : badgeDefault}
        title="หัวใจชมพู / แดงจากรหัสห้อง / แดงแจก · แตะเพื่อหัวใจของฉัน"
      >
        <span className="inline-flex items-center gap-0.5 tabular-nums" title="หัวใจชมพู">
          <GlossyHeartIcon tone="pink" className="h-4 w-4 shrink-0" forDarkBg={onBrand} />
          {pink.toLocaleString("th-TH")}
        </span>
        <span className={onBrand ? "text-white/45" : "text-slate-400"} aria-hidden>
          |
        </span>
        <span
          className="inline-flex max-w-[9rem] flex-wrap items-center gap-x-0.5 tabular-nums sm:max-w-none"
          title="แดงจากรหัสห้อง / แดงแจก"
        >
          <GlossyHeartIcon tone="red" className="h-4 w-4 shrink-0" forDarkBg={onBrand} />
          {roomRed.toLocaleString("th-TH")}
          {giveaway > 0 ? (
            <span
              className={
                onBrand
                  ? "text-[10px] font-semibold leading-tight text-rose-100"
                  : "text-[10px] font-semibold leading-tight text-rose-900/95"
              }
              title="แดงแจก — ใช้สร้างรหัสให้ผู้เล่น (เมนูแจกหัวใจแดง)"
            >
              +แจก {giveaway.toLocaleString("th-TH")}
            </span>
          ) : null}
          {roomRed > 0 ? (
            <span
              className={
                onBrand
                  ? "text-[10px] font-semibold leading-tight text-amber-100"
                  : "text-[10px] font-semibold leading-tight text-amber-900/90"
              }
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
      className={onBrand ? badgeOnBrand : badgeDefault}
      title="เข้าสู่ระบบเพื่อดูยอดหัวใจจากเซิร์ฟเวอร์"
    >
      {ready ? (
        <>
          <span className="inline-flex items-center gap-0.5 tabular-nums" title="หัวใจชมพู">
            <GlossyHeartIcon tone="pink" className="h-4 w-4 shrink-0" forDarkBg={onBrand} />
            {(0).toLocaleString("th-TH")}
          </span>
          <span className={onBrand ? "text-white/45" : "text-slate-400"} aria-hidden>
            |
          </span>
          <span className="inline-flex items-center gap-0.5 tabular-nums" title="หัวใจแดงจากรหัสห้อง">
            <GlossyHeartIcon tone="red" className="h-4 w-4 shrink-0" forDarkBg={onBrand} />
            {(0).toLocaleString("th-TH")}
          </span>
        </>
      ) : (
        <span className={onBrand ? "tabular-nums text-white/90" : "tabular-nums text-neutral-900"}>
          —
        </span>
      )}
    </Link>
  );
}
