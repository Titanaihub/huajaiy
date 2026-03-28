import Link from "next/link";
import HeartIcon from "./HeartIcon";

/**
 * โลโก้: หัวใจชมพูเข้มในแคปซูล + ชื่อแบรนด์ (ไม่ใช้รูปแบบอักขระ ♥ ที่แตกต่างกันตามฟอนต์)
 */
export default function BrandLogo({
  variant = "header"
}) {
  const compact = variant === "footer";
  const titleClass = compact
    ? "text-base font-bold tracking-tight text-white transition group-hover:text-brand-300"
    : "text-lg font-bold tracking-tight text-slate-900 transition group-hover:text-brand-800 sm:text-xl";
  const subClass = compact
    ? "block text-[10px] font-medium uppercase tracking-[0.08em] text-rose-200/85"
    : "hidden text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500 sm:block";

  const pillClass = compact
    ? "inline-flex shrink-0 items-center justify-center rounded-full border border-white/35 bg-white/15 px-2 py-1.5 shadow-sm backdrop-blur-sm"
    : "inline-flex shrink-0 items-center justify-center rounded-full border border-white/90 bg-white/55 px-2 py-1.5 shadow-game-sm backdrop-blur-md sm:px-2.5 sm:py-2";
  const heartClass = compact
    ? "h-6 w-6 text-rose-300"
    : "h-7 w-7 text-brand-700 sm:h-8 sm:w-8";

  return (
    <Link
      href="/"
      className="group flex items-center gap-2.5 sm:gap-3"
    >
      <span className={pillClass}>
        <HeartIcon className={heartClass} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={titleClass}>HUAJAIY</span>
        <span className={subClass}>Commerce · Game · Media</span>
      </span>
    </Link>
  );
}
