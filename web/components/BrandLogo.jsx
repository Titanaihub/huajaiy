"use client";

import Link from "next/link";
import HeartIcon from "./HeartIcon";

/**
 * โลโก้: หัวใจ (SVG เดียวกับ favicon) + ชื่อแบรนด์ — ไม่มีกรอบวงกลม
 * @param {{ variant?: "header" | "footer"; onBrand?: boolean }} props — onBrand = ข้อความขาวบนพื้นแบรนด์แดง (หน้าเกม)
 */
export default function BrandLogo({
  variant = "header",
  onBrand = false
}) {
  const compact = variant === "footer";
  const titleClass = compact
    ? "text-base font-bold tracking-tight text-white transition group-hover:text-brand-300"
    : onBrand
      ? "text-lg font-bold tracking-tight text-white transition group-hover:text-white/90 sm:text-xl"
      : "text-lg font-bold tracking-tight text-neutral-950 transition group-hover:text-neutral-900 sm:text-xl";

  const heartClass = compact
    ? "h-7 w-7 text-rose-200 sm:h-8 sm:w-8"
    : onBrand
      ? "heart-logo-blink h-8 w-8 text-rose-100 sm:h-9 sm:w-9"
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
