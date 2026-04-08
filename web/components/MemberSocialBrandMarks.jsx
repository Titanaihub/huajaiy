/** Silhouette เดียวกัน — ซ้อนสามชั้นสีมาตรฐาน TikTok (ฟ้า / แดง / หน้าดำหรือขาว) */
const TIKTOK_NOTE_D =
  "M12.525.02c1.31-.02 2.61-.01 3.919.02 0 1.38.017 2.76.001 4.14 1.15-.1 2.31-.19 3.47-.1.02 1.2.01 2.41 0 3.61.96.1 1.95.13 2.91.19.01 1.23.01 2.46 0 3.69-.97-.07-1.95-.13-2.91-.21-.02 1.98-.05 3.97-.1 5.94-.79 3.52-4.34 6.03-7.93 5.67-2.92-.29-5.45-2.36-6.39-5.13-.44-1.39-.61-2.89-.56-4.37.14-2.19 1.35-4.2 3.05-5.5 1.71-1.3 3.94-1.83 6.03-1.44.05.64.1 1.27.15 1.91-1.74-.31-3.68.09-4.96 1.41-.83.86-1.35 2.06-1.34 3.35.04 2.03 1.75 3.92 3.79 4.27.96.17 1.95-.02 2.81-.46 1.2-.61 2.01-1.82 2.14-3.12.04-1.67.01-3.35.01-5.02.99-.01 1.99-.01 2.99 0-.03 3.02.03 6.05-.03 9.07-.05.93-.34 1.86-.84 2.63-.8 1.21-2.14 2.03-3.54 2.28-1.39.24-2.85.08-4.14-.57-1.56-.75-2.74-2.16-3.21-3.83-.31-1.05-.28-2.17-.29-3.25.01-2.21.01-4.43-.03-6.64z";

/**
 * โลโก้ LINE / Facebook / TikTok แบบเดียวกันทั้งหน้าเพจสาธารณะและการ์ดโพสต์ — สีเต็ม (ไม่จาง)
 */
export function BrandLineWordmark({ className = "" }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/line-wordmark.svg"
      alt=""
      width={72}
      height={24}
      className={`h-11 w-auto max-w-[4.75rem] object-contain ${className}`.trim()}
      decoding="async"
    />
  );
}

export function BrandFacebookGlyph({ className = "" }) {
  return (
    <svg
      className={`h-7 w-7 ${className}`.trim()}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        fill="#1877F2"
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </svg>
  );
}

/**
 * โลโก้ TikTok หลายสี (ฟ้า #25F4EE + แดง #FE2C55 + ชั้นหน้า)
 * @param {{ className?: string; tone?: "onDark" | "onLight" }} props
 * — onDark = ปุ่มพื้นดำ, ชั้นหน้าเป็นขาว · onLight = พื้นสว่าง, ชั้นหน้าเป็นดำ
 */
export function BrandTiktokGlyph({ className = "", tone = "onDark" }) {
  const front = tone === "onLight" ? "#000000" : "#ffffff";
  return (
    <svg
      className={`h-7 w-7 ${className}`.trim()}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path fill="#25F4EE" d={TIKTOK_NOTE_D} transform="translate(0.55 0.55)" />
      <path fill="#FE2C55" d={TIKTOK_NOTE_D} transform="translate(-0.45 -0.45)" />
      <path fill={front} d={TIKTOK_NOTE_D} />
    </svg>
  );
}
