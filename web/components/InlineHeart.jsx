import HeartIcon from "./HeartIcon";

const sizeClass = {
  xs: "h-2.5 w-2.5",
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5"
};

/** หัวใจ SVG แนวนอนกับข้อความ — ไม่ใช้อักขระ ♥ */
export default function InlineHeart({ size = "sm", className = "" }) {
  return (
    <HeartIcon
      className={`inline-block shrink-0 align-[-0.12em] text-brand-700 ${sizeClass[size]} ${className}`}
      aria-hidden
    />
  );
}
