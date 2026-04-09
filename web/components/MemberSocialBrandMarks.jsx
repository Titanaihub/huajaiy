/** โลโก้ LINE / Facebook / TikTok — ใช้ไฟล์จาก `/public/social/` (เดียวกันทุกหน้า) */

const LINE_SRC = "/social/line.png";
const FB_SRC = "/social/facebook.png";
const TT_SRC = "/social/tiktok.png";

/**
 * ขนาดภาพโลโก้ให้เท่ากันทุกแบรนด์ (จัตุรัสเดียวกัน — object-contain รักษาสัดส่วนในกรอบ)
 * ใช้กับ `<img>` โดยตรงได้ (เช่น หน้าเกม) หรือผ่านคอมโพเนนต์ด้านล่าง
 */
export const SOCIAL_BRAND_ICON_IMG_CLASS = "h-9 w-9 object-contain";

/**
 * ห่อ `<a>` / `<button>` สำหรับโลโก้ชุดนี้ — ไม่มีกรอบ เงา หรือพื้นหลังกล่องรอบไอคอน
 */
export const SOCIAL_BRAND_ICON_WRAP_CLASS =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-transparent p-0 transition hover:opacity-90 focus-visible:outline focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-neutral-400/45";

/**
 * โลโก้ LINE (ไฟล์แนวนอน — ย่อให้พอดีกล่องจัตุรัสเดียวกับ FB/TikTok)
 */
export function BrandLineWordmark({ className = "" }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LINE_SRC}
      alt=""
      width={36}
      height={36}
      className={`${SOCIAL_BRAND_ICON_IMG_CLASS} ${className}`.trim()}
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
      width={36}
      height={36}
      className={`${SOCIAL_BRAND_ICON_IMG_CLASS} ${className}`.trim()}
      decoding="async"
    />
  );
}

/**
 * @param {{ className?: string; tone?: "onDark" | "onLight" }} props — tone คงไว้เพื่อความเข้ากันได้กับโค้ดเดิม (ไม่ใช้กับ PNG)
 */
export function BrandTiktokGlyph({ className = "", tone: _tone = "onDark" }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={TT_SRC}
      alt=""
      width={36}
      height={36}
      className={`${SOCIAL_BRAND_ICON_IMG_CLASS} ${className}`.trim()}
      decoding="async"
    />
  );
}
