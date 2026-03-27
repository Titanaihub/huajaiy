import Image from "next/image";
import Link from "next/link";

/**
 * โลโก้หัวใจ + ชื่อแบรนด์ — รูปอยู่ที่ /huajaiy-heart-logo.png
 */
export default function BrandLogo({
  variant = "header"
}) {
  const compact = variant === "footer";
  const titleClass = compact
    ? "text-base font-bold tracking-tight text-white transition group-hover:text-brand-300"
    : "text-lg font-bold tracking-tight text-slate-900 transition group-hover:text-brand-800 sm:text-xl";
  const subClass = compact
    ? "block text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400"
    : "hidden text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500 sm:block";

  return (
    <Link
      href="/"
      className="group flex items-center gap-2.5 sm:gap-3"
    >
      <span
        className={
          compact
            ? "relative block shrink-0"
            : "relative block shrink-0 drop-shadow-sm"
        }
      >
        <Image
          src="/huajaiy-heart-logo.png"
          alt="HUAJAIY"
          width={compact ? 100 : 128}
          height={compact ? 28 : 36}
          className={
            compact
              ? "h-7 w-auto max-w-[100px] object-contain object-left"
              : "h-9 w-auto max-w-[128px] object-contain object-left sm:h-10"
          }
          priority={!compact}
          sizes="(max-width: 640px) 100px, 128px"
        />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={titleClass}>HUAJAIY</span>
        <span className={subClass}>Commerce · Game · Media</span>
      </span>
    </Link>
  );
}
