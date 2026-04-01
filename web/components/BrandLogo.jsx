"use client";

import Link from "next/link";
import HeartIcon from "./HeartIcon";

/**
 * โลโก้: หัวใจ (SVG เดียวกับ favicon) + ชื่อแบรนด์ — ไม่มีกรอบวงกลม
 */
export default function BrandLogo({ variant = "header" }) {
  const compact = variant === "footer";
  const titleClass = compact
    ? "text-base font-bold tracking-tight text-hui-burgundy transition group-hover:text-hui-cta sm:text-lg"
    : "text-lg font-bold tracking-tight text-hui-burgundy transition group-hover:text-hui-cta sm:text-xl";

  const heartClass = compact
    ? "h-7 w-7 text-hui-cta sm:h-8 sm:w-8"
    : "heart-logo-blink h-8 w-8 sm:h-9 sm:w-9";

  return (
    <Link
      href="/"
      className="group flex items-center gap-2.5 sm:gap-3"
    >
      <span className="inline-flex shrink-0 items-center justify-center leading-none">
        <HeartIcon className={heartClass} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={titleClass}>HUAJAIY</span>
      </span>
    </Link>
  );
}
