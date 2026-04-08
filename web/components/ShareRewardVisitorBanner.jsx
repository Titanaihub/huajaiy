"use client";

/** สีเริ่มต้นเมื่อเจ้าของเพจยังไม่ตั้งค่า — โทนเดียวกับลิงก์เพจสมาชิก */
const DEFAULT_HEART_TINT = "#ff2e8c";

export function ShareRewardHeartGlyph({ tint }) {
  const fill =
    typeof tint === "string" && /^#[0-9a-fA-F]{6}$/.test(tint.trim())
      ? tint.trim().toLowerCase()
      : DEFAULT_HEART_TINT;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="inline-block h-3 w-3 shrink-0 align-[-0.125em]"
      aria-hidden
    >
      <path
        fill={fill}
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      />
    </svg>
  );
}

/**
 * ผู้เยี่ยมชม — แคมเปญแชร์ active: ข้อความคำนวณจาก redPerMember + maxRecipientSlots (เดียวกับการ์ดหน้าแรก)
 * @param {{ shareReward?: Record<string, unknown> | null; className?: string; heartTint?: string | null }} props
 * heartTint = สีเติม SVG หัวใจ (#rrggbb) จากการตั้งค่าเจ้าของเพจ
 */
export default function ShareRewardVisitorBanner({ shareReward, className = "", heartTint = null }) {
  if (!shareReward) return null;
  const st = String(shareReward.status || "");
  const per = Math.max(0, Math.floor(Number(shareReward.redPerMember) || 0));
  const maxSlots = Math.max(0, Math.floor(Number(shareReward.maxRecipientSlots) || 0));
  const box =
    "rounded-md border border-amber-200/80 bg-amber-50/90 px-2.5 py-2 text-[11px] leading-snug ";

  if (st === "active" && per > 0 && maxSlots > 0) {
    const tint =
      typeof heartTint === "string" && heartTint.trim() !== "" ? heartTint.trim() : null;
    return (
      <p
        className={`${box} text-neutral-900 ${className}`.trim()}
        role="status"
      >
        <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5">
          <span className="font-medium text-neutral-800">แชร์โพสต์นี้</span>
          <span className="inline-flex flex-wrap items-center gap-0.5 font-bold text-neutral-900">
            <span>ได้</span>
            <ShareRewardHeartGlyph tint={tint || DEFAULT_HEART_TINT} />
            <span className="tabular-nums">{per}</span>
            <span className="tabular-nums">/{maxSlots}คนแรก</span>
          </span>
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
