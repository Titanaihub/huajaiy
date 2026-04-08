/**
 * ปุ่มเม็ดยาวสีชมพูแบบกระชับ — ข้อความซ้าย + โลโก้ LINE ชิดขวา (สูงเต็มขอบเม็ดยาว)
 */
export const lineLoginPinkPillClassName =
  "inline-flex h-10 max-w-full shrink-0 items-stretch overflow-hidden rounded-full bg-[#FF4D94] pl-2.5 pr-0 text-xs font-bold text-white shadow-sm shadow-pink-500/25 transition hover:brightness-105 active:scale-[0.99] sm:h-11 sm:pl-3 sm:text-sm";

export function LineLoginPinkPillInner() {
  return (
    <>
      <span className="flex items-center whitespace-nowrap py-1.5 pr-2 pl-0.5 sm:py-2">
        เข้าระบบด้วย
      </span>
      <span className="relative flex shrink-0 items-stretch self-stretch overflow-hidden rounded-r-full border-l border-white/25">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/line-wordmark.svg"
          alt=""
          width={72}
          height={24}
          className="block h-full w-auto min-w-[4rem] max-w-[7rem] object-cover object-right"
          decoding="async"
        />
      </span>
    </>
  );
}
