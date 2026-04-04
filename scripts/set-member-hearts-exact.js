/**
 * ตั้งยอดหัวใจชมพู / แดงเล่นได้ / แดงแจก ให้สมาชิกตาม username (ครั้งเดียว — ฉุกเฉิน)
 *
 * บันทึก heart_ledger อัตโนมัติเมื่อยอดเปลี่ยน (delta จากยอดเดิม) — สมาชิกเห็นประวัติในหน้าบัญชี
 *
 * ต้องมี DATABASE_URL
 *
 * รัน (เครื่องหรือ Render Shell):
 *   CONFIRM_SET_HEARTS=ZERO_AUNYAWEE_NOW node scripts/set-member-hearts-exact.js aunyawee 0 0 0
 *
 * อาร์กิวเมนต์: username pink redPlayable redGiveaway (ตัวเลข ≥ 0)
 */
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env")
});

const { getPool } = require("../db/pool");
const heartLedgerService = require("../services/heartLedgerService");

const REQUIRED_CONFIRM = "ZERO_AUNYAWEE_NOW";

/** ข้อความ ledger — คล้ายแอดมินแต่ระบุว่ามาจากสคริปต์กำหนดยอด */
function buildScriptHeartLedgerLabel(pd, rd, gd) {
  const parts = [];
  if (pd !== 0) {
    parts.push(
      pd > 0
        ? `ได้รับหัวใจชมพู — กำหนดยอดโดยสคริปต์ฉุกเฉิน (+${pd})`
        : `หักหัวใจชมพู — กำหนดยอดโดยสคริปต์ฉุกเฉิน (${pd})`
    );
  }
  if (rd !== 0) {
    parts.push(
      rd > 0
        ? `ได้รับหัวใจแดง — กำหนดยอดโดยสคริปต์ฉุกเฉิน (+${rd})`
        : `หักหัวใจแดง — กำหนดยอดโดยสคริปต์ฉุกเฉิน (${rd})`
    );
  }
  if (gd !== 0) {
    parts.push(
      gd > 0
        ? `ได้รับหัวใจแดงแจก — กำหนดยอดโดยสคริปต์ฉุกเฉิน (+${gd})`
        : `หักหัวใจแดงแจก — กำหนดยอดโดยสคริปต์ฉุกเฉิน (${gd})`
    );
  }
  return parts.length > 0
    ? parts.join(" · ")
    : "กำหนดยอดหัวใจโดยสคริปต์ฉุกเฉิน (ไม่มีการเปลี่ยนแปลง)";
}

(async () => {
  const pool = getPool();
  if (!pool) {
    console.error("[set-hearts] ต้องมี DATABASE_URL");
    process.exitCode = 1;
    return;
  }
  if (String(process.env.CONFIRM_SET_HEARTS || "") !== REQUIRED_CONFIRM) {
    console.error(
      `[set-hearts] ตั้ง CONFIRM_SET_HEARTS=${REQUIRED_CONFIRM} ก่อนรัน (กันพลาด)`
    );
    process.exitCode = 1;
    return;
  }
  const username = String(process.argv[2] || "").trim().toLowerCase();
  const pink = Math.max(0, Math.floor(Number(process.argv[3]) || 0));
  const redPlay = Math.max(0, Math.floor(Number(process.argv[4]) || 0));
  const redGive = Math.max(0, Math.floor(Number(process.argv[5]) || 0));
  if (!username) {
    console.error(
      "[set-hearts] ใช้: node scripts/set-member-hearts-exact.js <username> <pink> <redPlayable> <redGiveaway>"
    );
    process.exitCode = 1;
    return;
  }
  const sum = pink + redPlay + redGive;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sel = await client.query(
      `SELECT id::text AS id, username,
              COALESCE(pink_hearts_balance, 0) AS p,
              COALESCE(red_hearts_balance, 0) AS r,
              COALESCE(red_giveaway_balance, 0) AS g
       FROM users WHERE LOWER(TRIM(username)) = $1
       FOR UPDATE`,
      [username]
    );
    if (sel.rows.length === 0) {
      await client.query("ROLLBACK");
      console.error(`[set-hearts] ไม่พบ username: ${username}`);
      process.exitCode = 1;
      return;
    }
    const row = sel.rows[0];
    const userId = String(row.id);
    const oldP = Math.max(0, Math.floor(Number(row.p) || 0));
    const oldR = Math.max(0, Math.floor(Number(row.r) || 0));
    const oldG = Math.max(0, Math.floor(Number(row.g) || 0));
    const pd = pink - oldP;
    const rd = redPlay - oldR;
    const gd = redGive - oldG;

    await client.query(
      `UPDATE users SET
        pink_hearts_balance = $2,
        red_hearts_balance = $3,
        red_giveaway_balance = $4,
        hearts_balance = $2::integer + $3::integer + $4::integer
       WHERE id = $1::uuid`,
      [userId, pink, redPlay, redGive]
    );

    if (pd !== 0 || rd !== 0 || gd !== 0) {
      await heartLedgerService.insertWithClient(client, {
        userId,
        pinkDelta: pd,
        redDelta: rd,
        pinkAfter: pink,
        redAfter: redPlay,
        kind: "script_set_exact",
        label: buildScriptHeartLedgerLabel(pd, rd, gd),
        meta: {
          source: "script_set_member_hearts_exact",
          script: "scripts/set-member-hearts-exact.js",
          adminUsername: null,
          previousPink: oldP,
          previousRedPlayable: oldR,
          previousRedGiveaway: oldG,
          pinkDelta: pd,
          redDelta: rd,
          redGiveawayDelta: gd,
          redGiveawayBalanceAfter: redGive
        }
      });
    }

    await client.query("COMMIT");
    console.log("[set-hearts] สำเร็จ:", {
      id: userId,
      username: row.username,
      pink,
      redPlayable: redPlay,
      redGiveaway: redGive,
      heartsTotal: sum,
      deltas: { pink: pd, red: rd, redGiveaway: gd },
      ledgerWritten: pd !== 0 || rd !== 0 || gd !== 0
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    console.error("[set-hearts] ล้มเหลว:", e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end().catch(() => {});
  }
})();
