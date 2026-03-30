/**
 * ลบข้อมูล one-off: aunyawee + phongphiphat47
 * รัน: DATABASE_URL ใน .env แล้ว
 *   node scripts/cleanup-users-20260330.js
 *
 * ให้ยอด aunyawee ตรงๆ (เช่น เคลียร์ 5099) ใส่ env ก่อนรัน:
 *   ONEOFF_EXACT_PINK=0 ONEOFF_EXACT_RED_PLAYABLE=0 ONEOFF_EXACT_RED_GIVEAWAY=0 node scripts/cleanup-users-20260330.js
 *
 * บน production แนะนำเรียก API แทน (ไม่ต้อง Shell):
 *   POST /api/admin/oneoff/cleanup-march-2026-users
 *   (ดูคอมเมนต์ใน adminRouter.js)
 */
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env")
});

const { getPool } = require("../db/pool");
const { runMarch2026AunyaweePhongCleanup } = require("../services/oneoffUserCleanupMarch2026");

function exactFromEnv() {
  const has =
    process.env.ONEOFF_EXACT_PINK !== undefined &&
    process.env.ONEOFF_EXACT_RED_PLAYABLE !== undefined &&
    process.env.ONEOFF_EXACT_RED_GIVEAWAY !== undefined;
  if (!has) return undefined;
  return {
    pink: Math.max(0, Math.floor(Number(process.env.ONEOFF_EXACT_PINK) || 0)),
    redPlayable: Math.max(
      0,
      Math.floor(Number(process.env.ONEOFF_EXACT_RED_PLAYABLE) || 0)
    ),
    redGiveaway: Math.max(
      0,
      Math.floor(Number(process.env.ONEOFF_EXACT_RED_GIVEAWAY) || 0)
    )
  };
}

(async () => {
  try {
    const r = await runMarch2026AunyaweePhongCleanup({
      aunyaweeExactBalances: exactFromEnv()
    });
    console.log(JSON.stringify(r, null, 2));
  } catch (e) {
    console.error("[cleanup] ล้มเหลว:", e.message);
    process.exitCode = 1;
  } finally {
    const p = getPool();
    if (p) await p.end().catch(() => {});
  }
})();
