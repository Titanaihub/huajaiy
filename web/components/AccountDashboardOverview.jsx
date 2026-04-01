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
      <p className="text-sm text-hui-muted" aria-live="polite">
        กำลังโหลด…
      </p>
    );
  }

  const pink = Number(user.pinkHeartsBalance ?? 0);
  const roomGift = Array.isArray(user.roomGiftRed) ? user.roomGiftRed : [];
  const roomGiftTotal = roomGift.reduce(
    (s, x) => s + Math.max(0, Math.floor(Number(x.balance) || 0)),
    0
  );

  return (
    <div className="space-y-8">
      <section>
        <h2 className="hui-h2">สวัสดี {user.firstName}</h2>
        <p className="mt-1 text-sm text-hui-muted">
          @{user.username} · เบอร์ {user.phone}
        </p>
        <div className="mt-4 max-w-md">
          <div className="rounded-2xl border border-hui-border bg-hui-surface p-4 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wide text-hui-section">
              หัวใจชมพู (เซิร์ฟเวอร์)
            </p>
            <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-hui-burgundy md:text-[1.75rem]">
              <InlineHeart className="text-hui-pink" />
              {pink.toLocaleString("th-TH")}
            </p>
            {roomGiftTotal > 0 ? (
              <div className="mt-3 rounded-lg border border-amber-200/90 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
                <p className="font-semibold">หัวใจแดงจากรหัสห้อง (รวม {roomGiftTotal.toLocaleString("th-TH")})</p>
                <ul className="mt-1 space-y-0.5 text-amber-900/90">
                  {roomGift.map((g) => (
                    <li key={g.creatorId}>
                      @{g.creatorUsername || "เจ้าของห้อง"}:{" "}
                      {Math.max(0, Math.floor(Number(g.balance) || 0)).toLocaleString("th-TH")} — ใช้เล่นได้เฉพาะเกมของเจ้าของหรือเกมที่เปิดรับรหัสห้อง
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="mt-2 text-xs text-hui-muted">
              แสดงเฉพาะยอดที่ใช้งานจริง: ชมพู และแดงจากรหัสห้อง — แดงแจกสำหรับออกรหัสดูที่เมนู
              「แจกหัวใจแดง」
            </p>
            <button
              type="button"
              onClick={() => refresh()}
              className="mt-3 text-xs font-semibold text-hui-cta underline decoration-hui-cta/35 underline-offset-2 hover:brightness-95"
            >
              รีเฟรชยอด
            </button>
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              <Link
                href="/account/my-hearts"
                className="text-xs font-semibold text-hui-cta underline decoration-hui-cta/35 underline-offset-2 hover:brightness-95"
              >
                หัวใจของฉัน (แยกตามเจ้าห้อง · เข้าเล่นเกม)
              </Link>
              <Link
                href="/account/heart-history/play"
                className="text-xs font-semibold text-hui-cta underline decoration-hui-cta/35 underline-offset-2 hover:brightness-95"
              >
                ประวัติหัวใจ (เล่นเกม)
              </Link>
              <Link
                href="/account/give-hearts"
                className="text-xs font-semibold text-hui-cta underline decoration-hui-cta/35 underline-offset-2 hover:brightness-95"
              >
                แจกหัวใจแดง (ทุนรหัสห้อง)
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
