"use client";

import Link from "next/link";
import GlossyHeartIcon from "./GlossyHeartIcon";
import { useHearts } from "./HeartsProvider";
import { useMemberAuth } from "./MemberAuthProvider";

const badgeClass =
  "inline-flex items-center gap-2 overflow-visible rounded-full border border-hui-border bg-white px-2 py-1 text-sm font-semibold text-hui-body shadow-none transition hover:border-hui-border hover:bg-hui-pageTop";

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
        className={badgeClass}
        title="หัวใจชมพู / แดงจากรหัสห้อง / แดงแจก · แตะเพื่อหัวใจของฉัน"
      >
        <span className="inline-flex items-center gap-0.5 tabular-nums" title="หัวใจชมพู">
          <GlossyHeartIcon tone="pink" className="h-4 w-4 shrink-0" />
          {pink.toLocaleString("th-TH")}
        </span>
        <span className="text-hui-muted" aria-hidden>
          |
        </span>
        <span
          className="inline-flex max-w-[9rem] flex-wrap items-center gap-x-0.5 tabular-nums sm:max-w-none"
          title="แดงจากรหัสห้อง / แดงแจก"
        >
          <GlossyHeartIcon tone="red" className="h-4 w-4 shrink-0" />
          {roomRed.toLocaleString("th-TH")}
          {giveaway > 0 ? (
            <span
              className="text-sm font-semibold leading-tight text-rose-900/95"
              title="แดงแจก — ใช้สร้างรหัสให้ผู้เล่น (เมนูแจกหัวใจแดง)"
            >
              +แจก {giveaway.toLocaleString("th-TH")}
            </span>
          ) : null}
          {roomRed > 0 ? (
            <span
              className="text-sm font-semibold leading-tight text-amber-900/90"
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
      className={badgeClass}
      title="เข้าสู่ระบบเพื่อดูยอดหัวใจจากเซิร์ฟเวอร์"
    >
      {ready ? (
        <>
          <span className="inline-flex items-center gap-0.5 tabular-nums" title="หัวใจชมพู">
            <GlossyHeartIcon tone="pink" className="h-4 w-4 shrink-0" />
            {(0).toLocaleString("th-TH")}
          </span>
          <span className="text-hui-muted" aria-hidden>
            |
          </span>
          <span className="inline-flex items-center gap-0.5 tabular-nums" title="หัวใจแดงจากรหัสห้อง">
            <GlossyHeartIcon tone="red" className="h-4 w-4 shrink-0" />
            {(0).toLocaleString("th-TH")}
          </span>
        </>
      ) : (
        <span className="tabular-nums text-hui-body">—</span>
      )}
    </Link>
  );
}
