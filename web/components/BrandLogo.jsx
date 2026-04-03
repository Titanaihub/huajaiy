"use client";

import Link from "next/link";
import HeartIcon from "./HeartIcon";

/**
 * โลโก้: หัวใจ (SVG เดียวกับ favicon) + ชื่อแบรนด์ — ไม่มีกรอบวงกลม
 * @param {"inline" | "stacked"} [layout] — inline = หัวใจกับข้อความแนวนอน (ค่าเริ่มต้น), stacked = หัวใจบน ข้อความ HUAJAIY ด้านล่าง
 * @param {"brand" | "organic"} [tone] — organic = สไตล์หัวเทมเพลตหน้าแรก (ตัวอักษรเข้ม uppercase)
 */
export default function BrandLogo({
  variant = "header",
  layout = "inline",
  tone = "brand"
}) {
  const compact = variant === "footer";
  const stacked = layout === "stacked" && !compact;
  const organic = tone === "organic" && !compact;

  const titleClass = compact
    ? "text-base font-bold tracking-tight text-hui-burgundy transition group-hover:text-hui-cta sm:text-lg"
    : organic
      ? "text-xl font-bold uppercase leading-none tracking-tight text-gray-900 transition group-hover:text-rose-600"
      : stacked
        ? "text-sm font-bold tracking-tight text-hui-burgundy transition group-hover:text-hui-cta sm:text-base"
        : "text-lg font-bold tracking-tight text-hui-burgundy transition group-hover:text-hui-cta sm:text-xl";

  const heartClass = compact
    ? "h-7 w-7 text-hui-cta sm:h-8 sm:w-8"
    : organic
      ? "heart-logo-blink h-10 w-10 shrink-0 text-hui-cta sm:h-10 sm:w-10"
      : stacked
        ? "heart-logo-blink h-8 w-8 text-hui-cta sm:h-9 sm:w-9"
        : "heart-logo-blink h-8 w-8 sm:h-9 sm:w-9";

  const linkClass = stacked
    ? "group flex shrink-0 flex-col items-center gap-0.5 leading-none sm:gap-1"
    : organic
      ? "group inline-flex items-center gap-2 text-gray-900"
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
