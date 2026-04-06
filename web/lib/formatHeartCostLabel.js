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

/**
 * ล็อบบี้ — รองรับโหมดชำระจาก API
 * @param {{ pinkHeartCost?: number; redHeartCost?: number; heartCurrencyMode?: string; acceptsPinkHearts?: boolean }} g
 */
export function formatCentralLobbyHeartLine(g) {
  const p = Math.max(0, Math.floor(Number(g?.pinkHeartCost) || 0));
  const r = Math.max(0, Math.floor(Number(g?.redHeartCost) || 0));
  const mode = String(g?.heartCurrencyMode || "both").toLowerCase();
  if (p === 0 && r === 0) return null;
  if (mode === "either") {
    const fee = Math.max(p, r);
    const acc = g?.acceptsPinkHearts !== false;
    return acc
      ? `หักต่อรอบ: ${fee} ดวง (เลือกจ่ายชมพูหรือแดง)`
      : `หักต่อรอบ: ${fee} ดวง (แดง)`;
  }
  if (mode === "pink_only") {
    return p > 0 ? `หักต่อรอบ: ${p} หัวใจชมพู` : null;
  }
  if (mode === "red_only") {
    return r > 0 ? `หักต่อรอบ: ${r} หัวใจแดง` : null;
  }
  return formatHeartCostPerRoundLine(p, r);
}

/**
 * บรรทัด «หักหัวใจ» บนการ์ดโชว์เกม — รูปแบบเช่น หัก 1 หัวใจแดง หรือ 1 หัวใจชมพู
 * @param {{ pinkHeartCost?: number; redHeartCost?: number; heartCurrencyMode?: string; acceptsPinkHearts?: boolean }} g
 */
export function formatGameShowcaseDeductLine(g) {
  const p = Math.max(0, Math.floor(Number(g?.pinkHeartCost) || 0));
  const r = Math.max(0, Math.floor(Number(g?.redHeartCost) || 0));
  const mode = String(g?.heartCurrencyMode || "both").toLowerCase();
  if (p === 0 && r === 0) return "ไม่หักหัวใจต่อรอบ";
  if (mode === "either") {
    const acc = g?.acceptsPinkHearts !== false;
    if (!acc && r > 0) return `หัก ${r} หัวใจแดง`;
    if (acc && p > 0 && r > 0) return `หัก ${r} หัวใจแดง หรือ ${p} หัวใจชมพู`;
    if (p > 0) return `หัก ${p} หัวใจชมพู`;
    if (r > 0) return `หัก ${r} หัวใจแดง`;
    return "—";
  }
  if (mode === "pink_only") {
    return p > 0 ? `หัก ${p} หัวใจชมพู` : "—";
  }
  if (mode === "red_only") {
    return r > 0 ? `หัก ${r} หัวใจแดง` : "—";
  }
  const parts = [];
  if (r > 0) parts.push(`${r} หัวใจแดง`);
  if (p > 0) parts.push(`${p} หัวใจชมพู`);
  return parts.length ? `หัก ${parts.join(" และ ")}` : "—";
}

/** สรุปสั้นไม่มีคำนำหน้า (เช่น ในแดชบอร์ดที่มีหัวข้อแยกแล้ว) */
export function formatHeartCostSummary(pinkHeartCost, redHeartCost) {
  const parts = heartCostParts(pinkHeartCost, redHeartCost);
  return parts.length > 0 ? parts.join(" · ") : "—";
}
