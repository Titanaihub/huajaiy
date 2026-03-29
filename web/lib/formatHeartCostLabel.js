/** ส่วนที่มียอด > 0 เท่านั้น — รูปแบบ "n หัวใจชมพู" / "n หัวใจแดง" */
export function heartCostParts(pinkHeartCost, redHeartCost) {
  const p = Math.max(0, Math.floor(Number(pinkHeartCost) || 0));
  const r = Math.max(0, Math.floor(Number(redHeartCost) || 0));
  const parts = [];
  if (p > 0) parts.push(`${p} หัวใจชมพู`);
  if (r > 0) parts.push(`${r} หัวใจแดง`);
  return parts;
}

/** บรรทัดเต็มสำหรับการ์ดล็อบบี้ — คืน null ถ้าไม่หักเลย */
export function formatHeartCostPerRoundLine(pinkHeartCost, redHeartCost) {
  const parts = heartCostParts(pinkHeartCost, redHeartCost);
  if (parts.length === 0) return null;
  return `หักหัวใจต่อรอบ: ${parts.join(" · ")}`;
}

/** สรุปสั้นไม่มีคำนำหน้า (เช่น ในแดชบอร์ดที่มีหัวข้อแยกแล้ว) */
export function formatHeartCostSummary(pinkHeartCost, redHeartCost) {
  const parts = heartCostParts(pinkHeartCost, redHeartCost);
  return parts.length > 0 ? parts.join(" · ") : "—";
}
