/** หัวข้อมูลหน้า — เส้นเน้นโทนแบรนด์ */
export default function SectionHeading({ id, eyebrow, title, subtitle }) {
  return (
    <div className="flex flex-col gap-1">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-800">
          {eyebrow}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <span className="h-1 w-10 shrink-0 rounded-full bg-brand-400" aria-hidden />
        <h2
          id={id}
          className="text-lg font-bold tracking-tight text-slate-900 md:text-xl"
        >
          {title}
        </h2>
      </div>
      {subtitle ? (
        <p className="mt-1 max-w-2xl text-sm text-slate-600 md:pl-[3.25rem]">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
