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
     WHERE game_id = $1 AND rule_id IS NOT NULL
     GROUP BY rule_id`,
    [gameId]
  );
  const out = {};
  for (const row of r.rows) {
    if (row.rid == null) continue;
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
      `SELECT id, prize_category, prize_total_qty, set_index, prize_title, prize_value_text, prize_unit
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
    const gameR = await client.query(`SELECT title FROM central_games WHERE id = $1`, [gameId]);
    const gameTitleAtWin =
      gameR.rows[0]?.title != null ? String(gameR.rows[0].title).trim() : "";
    const ins = await client.query(
      `INSERT INTO central_prize_awards (
        game_id, rule_id, winner_user_id, play_session_id, prize_category, status,
        rule_set_index, rule_prize_title, rule_prize_value_text, rule_prize_unit, game_title_at_win
      ) VALUES ($1, $2, $3, $4, $5, 'recorded', $6, $7, $8, $9, $10)
      ON CONFLICT (play_session_id) DO NOTHING
      RETURNING id`,
      [
        gameId,
        ruleId,
        userId,
        String(playSessionId).slice(0, 64),
        rule.prize_category,
        Math.max(0, Math.floor(Number(rule.set_index)) || 0),
        rule.prize_title != null ? String(rule.prize_title) : null,
        rule.prize_value_text != null ? String(rule.prize_value_text) : null,
        rule.prize_unit != null ? String(rule.prize_unit) : null,
        gameTitleAtWin || null
      ]
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
 * @returns {Promise<Array<object>>}
 */
async function listAwardsForUser(userId) {
  if (!userId) return [];
  const pool = requirePool();
  const r = await pool.query(
    `SELECT
       a.id,
       a.created_at AS "wonAt",
       a.prize_category AS "prizeCategory",
       a.game_id AS "gameId",
       COALESCE(NULLIF(trim(COALESCE(a.game_title_at_win, g.title)), ''), 'เกม') AS "gameTitle",
       NULLIF(BTRIM(COALESCE(g.game_code::text, '')), '') AS "gameCode",
       NULLIF(BTRIM(COALESCE(cu.username, '')), '') AS "creatorUsername",
       COALESCE(a.rule_set_index, r.set_index, 0) AS "setIndex",
       COALESCE(NULLIF(trim(a.rule_prize_title), ''), NULLIF(trim(r.prize_title), ''), '') AS "prizeTitle",
       COALESCE(NULLIF(trim(a.rule_prize_value_text), ''), NULLIF(trim(r.prize_value_text), ''), '') AS "prizeValueText",
       COALESCE(NULLIF(trim(a.rule_prize_unit), ''), NULLIF(trim(r.prize_unit), ''), '') AS "prizeUnit"
     FROM central_prize_awards a
     LEFT JOIN central_games g ON g.id = a.game_id
     LEFT JOIN users cu ON cu.id = g.created_by
     LEFT JOIN central_game_rules r ON r.id = a.rule_id
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
    gameCode: row.gameCode != null ? String(row.gameCode).trim() : "",
    creatorUsername: row.creatorUsername != null ? String(row.creatorUsername).trim().toLowerCase() : "",
    setIndex: Math.max(0, Math.floor(Number(row.setIndex)) || 0),
    prizeTitle: row.prizeTitle != null ? String(row.prizeTitle).trim() : "",
    prizeValueText: row.prizeValueText != null ? String(row.prizeValueText).trim() : "",
    prizeUnit: row.prizeUnit != null ? String(row.prizeUnit).trim() : ""
  }));
}

/**
 * รายการรางวัลทั้งหมดสำหรับแอดมิน/ผู้ดูแลเกม — ใช้ติดตามว่าต้องจ่ายให้ใคร
 * @param {{ gameId?: string | null, limit?: number }} opts
 */
async function listAllAwardsForAdmin(opts = {}) {
  const pool = requirePool();
  const lim = Math.min(2000, Math.max(1, Math.floor(Number(opts.limit) || 500)));
  const gameId = opts.gameId != null ? String(opts.gameId).trim() : "";
  const params = [];
  let where = `a.prize_category IS DISTINCT FROM 'none'`;
  if (gameId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(gameId)) {
    params.push(gameId);
    where += ` AND a.game_id = $${params.length}`;
  }
  params.push(lim);
  const r = await pool.query(
    `SELECT
       a.id,
       a.created_at AS "wonAt",
       a.prize_category AS "prizeCategory",
       a.status,
       a.game_id AS "gameId",
       COALESCE(NULLIF(trim(a.game_title_at_win), ''), NULLIF(trim(g.title), ''), 'เกม') AS "gameTitle",
       NULLIF(BTRIM(COALESCE(g.game_code::text, '')), '') AS "gameCode",
       a.rule_id AS "ruleId",
       COALESCE(a.rule_set_index, r.set_index, 0) AS "setIndex",
       COALESCE(NULLIF(trim(a.rule_prize_title), ''), NULLIF(trim(r.prize_title), ''), '') AS "prizeTitle",
       COALESCE(NULLIF(trim(a.rule_prize_value_text), ''), NULLIF(trim(r.prize_value_text), ''), '') AS "prizeValueText",
       COALESCE(NULLIF(trim(a.rule_prize_unit), ''), NULLIF(trim(r.prize_unit), ''), '') AS "prizeUnit",
       u.id AS "winnerUserId",
       u.username AS "winnerUsername",
       u.first_name AS "winnerFirstName",
       u.last_name AS "winnerLastName"
     FROM central_prize_awards a
     JOIN users u ON u.id = a.winner_user_id
     LEFT JOIN central_games g ON g.id = a.game_id
     LEFT JOIN central_game_rules r ON r.id = a.rule_id
     WHERE ${where}
     ORDER BY a.created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return r.rows.map((row) => ({
    id: String(row.id),
    wonAt: row.wonAt,
    prizeCategory: row.prizeCategory,
    status: row.status != null ? String(row.status) : "recorded",
    gameId: String(row.gameId),
    gameTitle: String(row.gameTitle || "").trim() || "เกม",
    gameCode: row.gameCode != null ? String(row.gameCode).trim() : null,
    ruleId: row.ruleId != null ? String(row.ruleId) : null,
    setIndex: Math.max(0, Math.floor(Number(row.setIndex)) || 0),
    prizeTitle: row.prizeTitle != null ? String(row.prizeTitle).trim() : "",
    prizeValueText: row.prizeValueText != null ? String(row.prizeValueText).trim() : "",
    prizeUnit: row.prizeUnit != null ? String(row.prizeUnit).trim() : "",
    winnerUserId: String(row.winnerUserId),
    winnerUsername: row.winnerUsername != null ? String(row.winnerUsername).trim() : "",
    winnerFirstName: row.winnerFirstName != null ? String(row.winnerFirstName).trim() : "",
    winnerLastName: row.winnerLastName != null ? String(row.winnerLastName).trim() : ""
  }));
}

module.exports = {
  countAwardsByRuleForGame,
  tryRecordWin,
  listPublicRecipientsForRule,
  listAwardsForUser,
  listAllAwardsForAdmin
};
