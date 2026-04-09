/**
 * รัน initDb() ครั้งเดียวต่อ DATABASE_URL (เพิ่มคอลัมน์/ตารางแบบ idempotent)
 * ใช้ในเครื่อง: ตั้ง DATABASE_URL ใน .env แล้ว npm run db:init
 * บน Render: Shell → cd โปรเจกต์ → node scripts/run-db-init.js (หรือรอ deploy — server เรียก initDb ตอนสตาร์ทอยู่แล้ว รวมตาราง central_game_play_sessions สำหรับเกมส่วนกลาง)
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { initDb } = require("../db/init");
const { getPool } = require("../db/pool");

(async () => {
  try {
    await initDb();
    console.log("[db:init] สำเร็จ");
  } catch (e) {
    console.error("[db:init] ล้มเหลว:", e.message);
    process.exitCode = 1;
  } finally {
    const p = getPool();
    if (p) {
      await p.end().catch(() => {});
    }
  }
})();
