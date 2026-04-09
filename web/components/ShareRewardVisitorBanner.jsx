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
 * @param {{ shareReward?: Record<string, unknown> | null; className?: string; heartTint?: string | null; viewerLoggedIn?: boolean | null }} props
 * heartTint = สีเติม SVG หัวใจ (#rrggbb) จากการตั้งค่าเจ้าของเพจ
 * viewerLoggedIn = ล็อกอินแล้วหรือไม่ — ใช้เลือกข้อความช่วย (ถ้าไม่ส่ง จะบอกแบบกลาง ๆ)
 */
export default function ShareRewardVisitorBanner({
  shareReward,
  className = "",
  heartTint = null,
  viewerLoggedIn = null
}) {
  if (!shareReward) return null;
  const st = String(shareReward.status || "");
  const per = Math.max(0, Math.floor(Number(shareReward.redPerMember) || 0));
  const maxSlots = Math.max(0, Math.floor(Number(shareReward.maxRecipientSlots) || 0));
  const box =
    "rounded-md border border-amber-200/80 bg-amber-50/90 px-2.5 py-2 text-[11px] leading-snug ";

  if (st === "active" && per > 0 && maxSlots > 0) {
    const tint =
      typeof heartTint === "string" && heartTint.trim() !== "" ? heartTint.trim() : null;
    let hint = "ล็อกอิน แล้วกดปุ่มแชร์หรือคัดลอกด้านล่าง — ได้หัวใจทันที · แค่เปิดอ่านไม่นับ";
    if (viewerLoggedIn === true) {
      hint = "กดปุ่มแชร์หรือคัดลอกด้านล่าง — ได้หัวใจทันที (คนละครั้ง) · แค่เปิดอ่านไม่นับ";
    } else if (viewerLoggedIn === false) {
      hint = "ต้องล็อกอินก่อน แล้วค่อยกดแชร์ — แค่เปิดอ่านไม่ได้หัวใจ";
    }
    return (
      <div
        className={`${box} space-y-1.5 text-neutral-900 ${className}`.trim()}
        role="status"
      >
        <p className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5 font-semibold text-neutral-900">
          <ShareRewardHeartGlyph tint={tint || DEFAULT_HEART_TINT} />
          <span>
            แชร์จากเว็บนี้ รับหัวใจแดง <span className="tabular-nums">{per}</span> ดวง
          </span>
          <span className="font-normal text-neutral-700">
            · จำกัด <span className="tabular-nums font-semibold text-neutral-900">{maxSlots}</span> คนแรก
          </span>
        </p>
        <p className="text-[10px] leading-snug text-neutral-700">{hint}</p>
      </div>
    );
  }

  const msg = shareReward.visitorMessage;
  if (msg) {
    return <p className={`${box} text-amber-950 ${className}`.trim()}>{msg}</p>;
  }
  return null;
}

/** แบนเนอร์ครอบคลุมหัวข้อแชร์แล้ว — ไม่ต้องใส่หัวข้อซ้ำ */
export function shareRewardBannerIncludesShareHeading(shareReward) {
  if (!shareReward) return false;
  const st = String(shareReward.status || "");
  const per = Math.max(0, Math.floor(Number(shareReward.redPerMember) || 0));
  const maxSlots = Math.max(0, Math.floor(Number(shareReward.maxRecipientSlots) || 0));
  return st === "active" && per > 0 && maxSlots > 0;
}
