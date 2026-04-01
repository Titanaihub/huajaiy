/** หัวข้อมูลหน้า — ระดับ section ตามสเกล hui (≈26px) */
export default function SectionHeading({ id, eyebrow, title, subtitle }) {
  return (
    <div className="flex flex-col gap-1">
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-hui-muted">
          {eyebrow}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <span className="h-1 w-10 shrink-0 rounded-full bg-hui-cta/80" aria-hidden />
        <h2 id={id} className="hui-h2 tracking-tight">
          {title}
        </h2>
      </div>
      {subtitle ? (
        <p className="mt-1 max-w-2xl text-base text-hui-body md:pl-[3.25rem]">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
