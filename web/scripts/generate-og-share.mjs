/**
 * สร้าง public/og-share.png สำหรับ Open Graph (รันด้วย: node scripts/generate-og-share.mjs)
 */
import sharp from "sharp";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "../public/og-share.png");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="42%" stop-color="#fff5f8"/>
      <stop offset="100%" stop-color="#ffe8f2"/>
    </linearGradient>
    <filter id="sh" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#e91e8c" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g transform="translate(520 150)" filter="url(#sh)">
    <rect width="160" height="160" rx="40" fill="#FF2E8C"/>
    <g transform="translate(32 28) scale(4)">
      <path fill="#ffffff" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </g>
  </g>
  <text x="600" y="420" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="72" font-weight="800" fill="#171717" letter-spacing="0.04em">HUAJAIY</text>
</svg>`;

const buf = await sharp(Buffer.from(svg)).png().toBuffer();
writeFileSync(outPath, buf);
console.log("Wrote", outPath, buf.length, "bytes");
