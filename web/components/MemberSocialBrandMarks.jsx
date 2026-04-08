/** โลโก้ LINE / Facebook / TikTok — ใช้ไฟล์จาก `/public/social/` (เดียวกันทุกหน้า) */

const LINE_SRC = "/social/line.png";
const FB_SRC = "/social/facebook.png";
const TT_SRC = "/social/tiktok.png";

/**
 * โลโก้ LINE แนวนอน (ไฟล์มีพื้นเขียวในตัว — ไม่ซ้อนปุ่มเขียวซ้ำ)
 */
export function BrandLineWordmark({ className = "" }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LINE_SRC}
      alt=""
      width={120}
      height={40}
      className={`h-10 w-auto max-w-[5.25rem] object-contain sm:h-11 sm:max-w-[5.75rem] ${className}`.trim()}
      decoding="async"
    />
  );
}

export function BrandFacebookGlyph({ className = "" }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={FB_SRC}
      alt=""
      width={40}
      height={40}
      className={`h-8 w-8 object-contain sm:h-9 sm:w-9 ${className}`.trim()}
      decoding="async"
    />
  );
}

/**
 * @param {{ className?: string; tone?: "onDark" | "onLight" }} props — tone ใช้กับ SVG เดิมเท่านั้น; PNG ใช้พื้นหลังจากปุ่มห่อ
 */
export function BrandTiktokGlyph({ className = "", tone: _tone = "onDark" }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={TT_SRC}
      alt=""
      width={40}
      height={40}
      className={`h-8 w-8 object-contain sm:h-9 sm:w-9 ${className}`.trim()}
      decoding="async"
    />
  );
}
