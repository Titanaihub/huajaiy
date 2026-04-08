/**
 * โลโก้คำว่า LINE แบบเขียว–ขาว (ใช้คู่ปุ่มสีชมพู — ตัวอักษร "เข้าสู่ระบบ" เป็นสีขาวแยกต่างหาก)
 */
export default function LineLogoMark({ className = "" }) {
  return (
    <span className={`inline-flex shrink-0 items-center ${className}`.trim()}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/line-wordmark.svg"
        alt=""
        width={72}
        height={24}
        className="h-[22px] w-auto sm:h-6"
        decoding="async"
      />
    </span>
  );
}
