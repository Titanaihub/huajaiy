/** หัวข้อมูลหน้า — เส้นเน้นโทนแบรนด์ */
export default function SectionHeading({ id, eyebrow, title, subtitle }) {
  return (
    <div className="flex flex-col gap-1">
      {eyebrow ? (
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-rose-800 drop-shadow-sm">
          {eyebrow}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="h-1.5 w-11 shrink-0 rounded-full bg-gradient-to-r from-pink-400 via-rose-500 to-red-500 shadow-sm"
          aria-hidden
        />
        <h2
          id={id}
          className="text-lg font-extrabold tracking-tight text-slate-900 drop-shadow-sm md:text-xl"
        >
          {title}
        </h2>
      </div>
      {subtitle ? (
        <p className="mt-1 max-w-2xl text-sm font-medium text-slate-700 md:pl-[3.5rem]">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
