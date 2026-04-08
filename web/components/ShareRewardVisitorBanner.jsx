"use client";

/**
 * ผู้เยี่ยมชมเห็นข้อความสั้นเมื่อแคมเปญแชร์ active — หรือข้อความ paused/depleted จาก API
 * @param {{ shareReward?: Record<string, unknown> | null; className?: string }} props
 */
export default function ShareRewardVisitorBanner({ shareReward, className = "" }) {
  if (!shareReward) return null;
  const st = String(shareReward.status || "");
  const per = Math.max(0, Math.floor(Number(shareReward.redPerMember) || 0));
  const maxSlots = Math.max(0, Math.floor(Number(shareReward.maxRecipientSlots) || 0));
  const box =
    "rounded-md border border-amber-200/80 bg-amber-50/90 px-2.5 py-2 text-[11px] leading-snug ";

  if (st === "active" && per > 0 && maxSlots > 0) {
    return (
      <p className={`${box} text-neutral-900 ${className}`.trim()}>
        <span>แชร์โพสต์นี้ </span>
        <span className="font-bold text-red-600">
          ได้ {per} รูปหัวใจ/{maxSlots}ท่านแรก
        </span>
      </p>
    );
  }

  const msg = shareReward.visitorMessage;
  if (msg) {
    return <p className={`${box} text-amber-950 ${className}`.trim()}>{msg}</p>;
  }
  return null;
}

/** แบนเนอร์มีคำว่า「แชร์โพสต์นี้」แล้ว — ไม่ต้องใส่หัวข้อซ้ำ */
export function shareRewardBannerIncludesShareHeading(shareReward) {
  if (!shareReward) return false;
  const st = String(shareReward.status || "");
  const per = Math.max(0, Math.floor(Number(shareReward.redPerMember) || 0));
  const maxSlots = Math.max(0, Math.floor(Number(shareReward.maxRecipientSlots) || 0));
  return st === "active" && per > 0 && maxSlots > 0;
}
