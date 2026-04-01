"use client";

const HEART_D =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

/** ชมพูสด — ตรงโทนกับหัวใจโลโก้ (.heart-logo-blink) */
const FILL_PINK = "#db2777";
/** แดงสด — โทนส้มแดง แยกจากชมพูโลโก้ชัด */
const FILL_RED = "#dc2626";

/**
 * ไอคอนหัวใจสีทึบ (HeartsBadge) — ไม่มีไล่สี / ไม่มี filter เงา
 */
export default function GlossyHeartIcon({
  tone = "pink",
  className = "h-4 w-4 shrink-0"
}) {
  const fill = tone === "red" ? FILL_RED : FILL_PINK;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      style={{ filter: "none" }}
    >
      <path d={HEART_D} fill={fill} />
    </svg>
  );
}
