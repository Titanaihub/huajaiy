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

  const glowA = isPink ? "#ff00ee" : "#ff2222";
  const glowB = isPink ? "#ff00aa" : "#ff0000";

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
              <stop offset="0%" stopColor="#fff0ff" />
              <stop offset="18%" stopColor="#ff66ff" />
              <stop offset="45%" stopColor="#ff00cc" />
              <stop offset="72%" stopColor="#d900a8" />
              <stop offset="100%" stopColor="#7a0066" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#fff0f0" />
              <stop offset="20%" stopColor="#ff6b6b" />
              <stop offset="48%" stopColor="#ff0033" />
              <stop offset="75%" stopColor="#cc0000" />
              <stop offset="100%" stopColor="#660000" />
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
