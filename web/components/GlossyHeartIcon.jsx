"use client";

import { useId } from "react";

const HEART_D =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

/**
 * หัวใจโทนนีออน — ชั้นเรืองแสง SVG + ไล่สีสะท้อน (แถบยอดหัวใจ)
 */
export default function GlossyHeartIcon({
  tone = "pink",
  className = "h-4 w-4 shrink-0"
}) {
  const raw = useId().replace(/:/g, "");
  const b = tone === "red" ? `rh${raw}` : `ph${raw}`;

  const blurSoft = `${b}-bs`;
  const blurWide = `${b}-bw`;
  const lg = `${b}-lg`;
  const rg = `${b}-rg`;
  const sg = `${b}-sp`;

  const isPink = tone === "pink";

  /* โทนชมพูอิงสีหัวใจโลโก้ HUAJAIY (~#D82B7D) — แดงคู่ให้สดเข้มในระดับเดียวกัน */
  const glowA = isPink ? "#ff5aad" : "#ff3d4d";
  const glowB = isPink ? "#d82b7d" : "#d01028";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      style={{
        overflow: "visible"
      }}
    >
      <defs>
        <filter id={blurSoft} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="b" />
          <feColorMatrix
            in="b"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.25 0"
            result="g"
          />
        </filter>
        <filter id={blurWide} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="b" />
          <feColorMatrix
            in="b"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.85 0"
          />
        </filter>
        <linearGradient id={lg} x1="10%" y1="0%" x2="90%" y2="100%">
          {isPink ? (
            <>
              <stop offset="0%" stopColor="#fff5f9" />
              <stop offset="18%" stopColor="#ff7eb8" />
              <stop offset="42%" stopColor="#e8368f" />
              <stop offset="68%" stopColor="#d82b7d" />
              <stop offset="100%" stopColor="#7a1a4a" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#fff5f5" />
              <stop offset="20%" stopColor="#ff6a6a" />
              <stop offset="46%" stopColor="#e91d35" />
              <stop offset="72%" stopColor="#c41228" />
              <stop offset="100%" stopColor="#6b0f18" />
            </>
          )}
        </linearGradient>
        <radialGradient id={rg} cx="28%" cy="22%" r="55%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={sg} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="48%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="52%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path
        d={HEART_D}
        fill={glowB}
        opacity={0.55}
        filter={`url(#${blurWide})`}
      />
      <path
        d={HEART_D}
        fill={glowA}
        opacity={0.75}
        filter={`url(#${blurSoft})`}
      />
      <path d={HEART_D} fill={`url(#${lg})`} />
      <path d={HEART_D} fill={`url(#${rg})`} />
      <ellipse
        cx="9"
        cy="8.5"
        rx="3.4"
        ry="2.1"
        fill={`url(#${sg})`}
        transform="rotate(-26 9 8.5)"
        opacity={0.9}
      />
    </svg>
  );
}
