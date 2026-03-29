const { getPool } = require("../db/pool");

function requirePool() {
  const pool = getPool();
  if (!pool) {
    const e = new Error("DB_REQUIRED");
    e.code = "DB_REQUIRED";
    throw e;
  }
  return pool;
}

/**
 * @returns {Promise<Record<string, number>>} ruleId -> จำนวนที่บันทึกแล้ว
 */
async function countAwardsByRuleForGame(gameId) {
  const pool = requirePool();
  const r = await pool.query(
    `SELECT rule_id::text AS rid, COUNT(*)::int AS c
     FROM central_prize_awards
     WHERE game_id = $1
     GROUP BY rule_id`,
    [gameId]
  );
  const out = {};
  for (const row of r.rows) {
    out[String(row.rid)] = row.c;
  }
  return out;
}

/**
 * บันทึกเฉพาะเมื่อชนะรางวัล (ไม่เรียกเมื่อแพ้ / none)
 * สมาชิกล็อกอินเท่านั้น — ไม่ล็อกอินไม่สร้างแถว
 * @returns {{ inserted: boolean, reason?: string, awardId?: string }}
 */
async function tryRecordWin({ userId, gameId, ruleId, playSessionId }) {
  if (!userId || !gameId || !ruleId || !playSessionId) {
    return { inserted: false, reason: "MISSING_FIELDS" };
  }
  const pool = requirePool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ruleR = await client.query(
      `SELECT id, prize_category, prize_total_qty
       FROM central_game_rules
       WHERE id = $1 AND game_id = $2
       FOR UPDATE`,
      [ruleId, gameId]
    );
    if (ruleR.rows.length === 0) {
      await client.query("ROLLBACK");
      return { inserted: false, reason: "RULE_NOT_FOUND" };
    }
    const rule = ruleR.rows[0];
    if (rule.prize_category === "none") {
      await client.query("ROLLBACK");
      return { inserted: false, reason: "NOT_A_PRIZE_RULE" };
    }
    const cap =
      rule.prize_total_qty == null
        ? Number.MAX_SAFE_INTEGER
        : Math.max(1, Math.floor(Number(rule.prize_total_qty)) || 1);
    const cntR = await client.query(
      `SELECT COUNT(*)::int AS n FROM central_prize_awards WHERE rule_id = $1`,
      [ruleId]
    );
    const n = cntR.rows[0].n;
    if (n >= cap) {
      await client.query("ROLLBACK");
      return { inserted: false, reason: "PRIZE_POOL_EXHAUSTED" };
    }
    const ins = await client.query(
      `INSERT INTO central_prize_awards (
        game_id, rule_id, winner_user_id, play_session_id, prize_category, status
      ) VALUES ($1, $2, $3, $4, $5, 'recorded')
      ON CONFLICT (play_session_id) DO NOTHING
      RETURNING id`,
      [gameId, ruleId, userId, String(playSessionId).slice(0, 64), rule.prize_category]
    );
    await client.query("COMMIT");
    if (ins.rows.length === 0) {
      return { inserted: false, reason: "SESSION_ALREADY_RECORDED" };
    }
    return { inserted: true, awardId: ins.rows[0].id };
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw e;
  } finally {
    client.release();
  }
}

/** เกมที่เปิดแสดงสาธารณะ + กติกาเป็นของเกมนั้น */
async function assertRulePublicForGame(gameId, ruleId) {
  const pool = requirePool();
  const g = await pool.query(
    `SELECT id FROM central_games
     WHERE id = $1 AND (is_published = TRUE OR is_active = TRUE)`,
    [gameId]
  );
  if (g.rows.length === 0) return null;
  const rule = await pool.query(
    `SELECT id, prize_category, prize_total_qty
     FROM central_game_rules
     WHERE id = $1 AND game_id = $2`,
    [ruleId, gameId]
  );
  if (rule.rows.length === 0) return null;
  return rule.rows[0];
}

/**
 * รายชื่อผู้ได้รับ (สาธารณะ) + ยอดแจก — ไม่ส่งข้อมูลบัญชี
 */
async function listPublicRecipientsForRule(gameId, ruleId) {
  const meta = await assertRulePublicForGame(gameId, ruleId);
  if (!meta) return null;
  if (meta.prize_category === "none") {
    return { recipients: [], givenCount: 0, totalQty: null };
  }
  const totalQty =
    meta.prize_total_qty == null
      ? null
      : Math.max(1, Math.floor(Number(meta.prize_total_qty)) || 1);
  const list = await requirePool().query(
    `SELECT u.username, a.created_at AS "wonAt"
     FROM central_prize_awards a
     JOIN users u ON u.id = a.winner_user_id
     WHERE a.game_id = $1 AND a.rule_id = $2
     ORDER BY a.created_at ASC`,
    [gameId, ruleId]
  );
  const givenCount = list.rows.length;
  return {
    recipients: list.rows.map((row) => ({
      username: row.username,
      wonAt: row.wonAt
    })),
    givenCount,
    totalQty
  };
}

/**
 * รางวัลจากเกมส่วนกลางที่ผู้ใช้ได้รับ (ล็อกอิน)
 * @returns {Promise<Array<{ id: string; wonAt: string; prizeCategory: string; gameId: string; gameTitle: string; setIndex: number; prizeTitle: string | null; prizeValueText: string | null; prizeUnit: string | null }>>}
 */
async function listAwardsForUser(userId) {
  if (!userId) return [];
  const pool = requirePool();
  const r = await pool.query(
    `SELECT
       a.id,
       a.created_at AS "wonAt",
       a.prize_category AS "prizeCategory",
       g.id AS "gameId",
       g.title AS "gameTitle",
       r.set_index AS "setIndex",
       r.prize_title AS "prizeTitle",
       r.prize_value_text AS "prizeValueText",
       r.prize_unit AS "prizeUnit"
     FROM central_prize_awards a
     JOIN central_games g ON g.id = a.game_id
     JOIN central_game_rules r ON r.id = a.rule_id
     WHERE a.winner_user_id = $1
       AND a.prize_category IS DISTINCT FROM 'none'
     ORDER BY a.created_at DESC`,
    [userId]
  );
  return r.rows.map((row) => ({
    id: String(row.id),
    wonAt: row.wonAt,
    prizeCategory: row.prizeCategory,
    gameId: String(row.gameId),
    gameTitle: String(row.gameTitle || "").trim() || "เกม",
    setIndex: Math.max(0, Math.floor(Number(row.setIndex)) || 0),
    prizeTitle: row.prizeTitle != null ? String(row.prizeTitle).trim() : "",
    prizeValueText: row.prizeValueText != null ? String(row.prizeValueText).trim() : "",
    prizeUnit: row.prizeUnit != null ? String(row.prizeUnit).trim() : ""
  }));
}

module.exports = {
  countAwardsByRuleForGame,
  tryRecordWin,
  listPublicRecipientsForRule,
  listAwardsForUser
};
