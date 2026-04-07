"use client";

/**
 * เนื้อหาบล็อกบน — แบบเดียวกับ /theme-lab/central
 *
 * @param {{ sectionLabel?: string, variant?: "preview" | "memberShellTop" | "memberProfileTop" }} [props]
 * - preview = หน้าทดสอบ theme lab (ข้อความตัวอย่างเต็ม)
 * - memberShellTop = ใต้ `/member/{slug}` มี iframe TailAdmin ด้านล่าง
 * - memberProfileTop = หน้า `/member` โปรไฟล์ — ไม่ขึ้นกับ iframe
 */
export default function CentralTemplatePreviewDemo({
  sectionLabel,
  variant = "preview"
} = {}) {
  const label = String(sectionLabel || "").trim();
  const isPreview = variant === "preview";
  const isMemberShellTop = variant === "memberShellTop";
  const isMemberProfileTop = variant === "memberProfileTop";

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-3 py-8 sm:px-5 sm:py-12">
      <div className="rounded-2xl border border-dashed border-pink-200/90 bg-white/70 p-8 text-center shadow-inner shadow-pink-100/40 sm:p-10">
        <p className="text-lg font-bold text-[#FF2E8C]">เทมเพลตกลาง HUAJAIY</p>
        {label && (isPreview || isMemberProfileTop) ? (
          <p className="mt-3 text-base font-semibold text-neutral-800">{label}</p>
        ) : null}
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          พื้นหลังชมพูอ่อน = โซนเนื้อหาหลัก · ด้านบนและล่างคือโครงเดียวกับหน้าแรก
        </p>
        {isPreview && !label ? (
          <p className="mt-2 text-xs text-neutral-500">
            เปิดจาก URL นี้เพื่อดูก่อน แล้วค่อยผูกหน้าจริงทีหลัง
          </p>
        ) : null}
        {isPreview && label ? (
          <p className="mt-2 text-xs text-neutral-500">
            ด้านล่างเป็นลิงก์/ระบบเดิม (TailAdmin) แยกท่อนตามเดิม
          </p>
        ) : null}
        {isMemberShellTop ? (
          <p className="mt-2 text-xs text-neutral-500">
            ด้านล่างเป็นลิงก์/ระบบเดิม (TailAdmin) แยกท่อนตามเดิม
          </p>
        ) : null}
        {isMemberProfileTop ? (
          <p className="mt-2 text-xs text-neutral-500">
            โปรไฟล์ หัวใจ และการตั้งค่า — โครงเดียวกับเทมเพลตกลาง
          </p>
        ) : null}
      </div>
    </div>
  );
}
