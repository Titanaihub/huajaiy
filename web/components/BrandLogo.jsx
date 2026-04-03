"use client";

import Link from "next/link";
import HeartIcon from "./HeartIcon";

/**
 * โลโก้: หัวใจ (SVG เดียวกับ favicon) + ชื่อแบรนด์ — ไม่มีกรอบวงกลม
 * @param {"inline" | "stacked"} [layout] — inline = หัวใจกับข้อความแนวนอน (ค่าเริ่มต้น), stacked = หัวใจบน ข้อความ HUAJAIY ด้านล่าง
 */
export default function BrandLogo({ variant = "header", layout = "inline" }) {
  const compact = variant === "footer";
  const stacked = layout === "stacked" && !compact;

  const titleClass = compact
    ? "text-base font-bold tracking-tight text-hui-burgundy transition group-hover:text-hui-cta sm:text-lg"
    : stacked
      ? "text-sm font-bold tracking-tight text-hui-burgundy transition group-hover:text-hui-cta sm:text-base"
      : "text-lg font-bold tracking-tight text-hui-burgundy transition group-hover:text-hui-cta sm:text-xl";

  const heartClass = compact
    ? "h-7 w-7 text-hui-cta sm:h-8 sm:w-8"
    : stacked
      ? "heart-logo-blink h-8 w-8 text-hui-cta sm:h-9 sm:w-9"
      : "heart-logo-blink h-8 w-8 sm:h-9 sm:w-9";

  const linkClass = stacked
    ? "group flex shrink-0 flex-col items-center gap-0.5 leading-none sm:gap-1"
    : "group flex items-center gap-2.5 sm:gap-3";

  return (
    <Link href="/" className={linkClass}>
      <span className="inline-flex shrink-0 items-center justify-center leading-none">
        <HeartIcon className={heartClass} aria-hidden />
      </span>
      <span
        className={
          stacked
            ? "flex min-w-0 flex-col items-center leading-tight"
            : "flex min-w-0 flex-col leading-tight"
        }
      >
        <span className={titleClass}>HUAJAIY</span>
      </span>
    </Link>
  );
}
