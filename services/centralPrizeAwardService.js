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

function normalizeItemMode(v) {
  const m = String(v || "").trim().toLowerCase();
  if (m === "pickup" || m === "ship") return m;
  return "";
}

/** จากกติกา: เงินสด pickup|transfer · สิ่งของ pickup|ship */
function fulfillmentFromRuleRow(rule) {
  const cat = String(rule.prize_category || "").toLowerCase();
  const raw = rule.prize_fulfillment_mode != null ? String(rule.prize_fulfillment_mode).trim().toLowerCase() : "";
  if (cat === "cash") return raw === "pickup" ? "pickup" : "transfer";
  if (cat === "item") return raw === "pickup" ? "pickup" : "ship";
  return null;
}

function normalizeItemStatus(v) {
  const s = String(v || "").trim().toLowerCase();
  if (["pending_creator", "ready_pickup", "shipped", "completed"].includes(s)) {
    return s;
  }
  return "";
}

/**
 * @returns {Promise<Record<string, number>>} ruleId -> จำนวนที่บันทึกแล้ว
 */
async function countAwardsByRuleForGame(gameId) {
  const pool = requirePool();
  const r = await pool.query(
    `SELECT r.id::text AS rid, COUNT(a.id)::int AS c
     FROM central_game_rules r
     LEFT JOIN central_prize_awards a
       ON a.game_id = r.game_id
      AND (
        a.rule_id = r.id
        OR (
          a.rule_id IS NULL
          AND COALESCE(a.rule_set_index, -1) = COALESCE(r.set_index, -2)
          AND COALESCE(a.prize_category, '') = COALESCE(r.prize_category, '')
          AND COALESCE(BTRIM(a.rule_prize_title), '') = COALESCE(BTRIM(r.prize_title), '')
          AND COALESCE(BTRIM(a.rule_prize_value_text), '') = COALESCE(BTRIM(r.prize_value_text), '')
          AND COALESCE(BTRIM(a.rule_prize_unit), '') = COALESCE(BTRIM(r.prize_unit), '')
        )
      )
     WHERE r.game_id = $1::uuid
     GROUP BY r.id`,
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
      `SELECT id, prize_category, prize_total_qty, set_index, prize_title, prize_value_text, prize_unit,
              prize_fulfillment_mode
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
      `SELECT COUNT(*)::int AS n
       FROM central_prize_awards
       WHERE game_id = $1::uuid
         AND (
           rule_id = $2::uuid
           OR (
             rule_id IS NULL
             AND COALESCE(rule_set_index, -1) = COALESCE($3::int, -2)
             AND COALESCE(prize_category, '') = COALESCE($4::text, '')
             AND COALESCE(BTRIM(rule_prize_title), '') = COALESCE(BTRIM($5::text), '')
             AND COALESCE(BTRIM(rule_prize_value_text), '') = COALESCE(BTRIM($6::text), '')
             AND COALESCE(BTRIM(rule_prize_unit), '') = COALESCE(BTRIM($7::text), '')
           )
         )`,
      [
        gameId,
        ruleId,
        Math.max(0, Math.floor(Number(rule.set_index)) || 0),
        rule.prize_category != null ? String(rule.prize_category) : "",
        rule.prize_title != null ? String(rule.prize_title) : "",
        rule.prize_value_text != null ? String(rule.prize_value_text) : "",
        rule.prize_unit != null ? String(rule.prize_unit) : ""
      ]
    );
    const n = cntR.rows[0].n;
    if (n >= cap) {
      await client.query("ROLLBACK");
      return { inserted: false, reason: "PRIZE_POOL_EXHAUSTED" };
    }
    const gameR = await client.query(`SELECT title FROM central_games WHERE id = $1`, [gameId]);
    const gameTitleAtWin =
      gameR.rows[0]?.title != null ? String(gameR.rows[0].title).trim() : "";
    const fulfillment = fulfillmentFromRuleRow(rule);
    const itemMode =
      String(rule.prize_category).toLowerCase() === "item" && fulfillment
        ? fulfillment
        : null;
    const ins = await client.query(
      `INSERT INTO central_prize_awards (
        game_id, rule_id, winner_user_id, play_session_id, prize_category, status,
        rule_set_index, rule_prize_title, rule_prize_value_text, rule_prize_unit, game_title_at_win,
        item_fulfillment_mode, prize_fulfillment_mode
      ) VALUES ($1, $2, $3, $4, $5, 'recorded', $6, $7, $8, $9, $10, $11, $12)
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
        gameTitleAtWin || null,
        itemMode,
        fulfillment
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
     LEFT JOIN central_game_rules r ON r.id = $2::uuid
     WHERE a.game_id = $1::uuid
       AND (
         a.rule_id = $2::uuid
         OR (
           a.rule_id IS NULL
           AND r.id IS NOT NULL
           AND COALESCE(a.rule_set_index, -1) = COALESCE(r.set_index, -2)
           AND COALESCE(a.prize_category, '') = COALESCE(r.prize_category, '')
           AND COALESCE(BTRIM(a.rule_prize_title), '') = COALESCE(BTRIM(r.prize_title), '')
           AND COALESCE(BTRIM(a.rule_prize_value_text), '') = COALESCE(BTRIM(r.prize_value_text), '')
           AND COALESCE(BTRIM(a.rule_prize_unit), '') = COALESCE(BTRIM(r.prize_unit), '')
         )
       )
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
       COALESCE(NULLIF(trim(a.rule_prize_unit), ''), NULLIF(trim(r.prize_unit), ''), '') AS "prizeUnit",
       a.item_fulfillment_mode AS "itemFulfillmentMode",
       COALESCE(
         NULLIF(BTRIM(COALESCE(a.prize_fulfillment_mode::text, '')), ''),
         NULLIF(BTRIM(COALESCE(r.prize_fulfillment_mode::text, '')), '')
       ) AS "prizeFulfillmentMode",
       a.item_fulfillment_status AS "itemFulfillmentStatus",
       a.item_fulfillment_note AS "itemFulfillmentNote",
       a.item_tracking_code AS "itemTrackingCode",
       a.item_shipping_address_snapshot AS "itemShippingAddressSnapshot",
       a.item_resolved_at AS "itemResolvedAt"
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
    prizeUnit: row.prizeUnit != null ? String(row.prizeUnit).trim() : "",
    itemFulfillmentMode:
      row.itemFulfillmentMode != null ? String(row.itemFulfillmentMode).trim().toLowerCase() : "",
    prizeFulfillmentMode: fulfillmentFromRuleRow({
      prize_category: row.prizeCategory,
      prize_fulfillment_mode: row.prizeFulfillmentMode
    }),
    itemFulfillmentStatus:
      row.itemFulfillmentStatus != null
        ? String(row.itemFulfillmentStatus).trim().toLowerCase()
        : "pending_creator",
    itemFulfillmentNote:
      row.itemFulfillmentNote != null ? String(row.itemFulfillmentNote).trim() : "",
    itemTrackingCode: row.itemTrackingCode != null ? String(row.itemTrackingCode).trim() : "",
    itemShippingAddressSnapshot:
      row.itemShippingAddressSnapshot && typeof row.itemShippingAddressSnapshot === "object"
        ? row.itemShippingAddressSnapshot
        : null,
    itemResolvedAt: row.itemResolvedAt || null
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
       NULLIF(BTRIM(COALESCE(cu.username, '')), '') AS "creatorUsername",
       a.rule_id AS "ruleId",
       COALESCE(a.rule_set_index, r.set_index, 0) AS "setIndex",
       COALESCE(NULLIF(trim(a.rule_prize_title), ''), NULLIF(trim(r.prize_title), ''), '') AS "prizeTitle",
       COALESCE(NULLIF(trim(a.rule_prize_value_text), ''), NULLIF(trim(r.prize_value_text), ''), '') AS "prizeValueText",
       COALESCE(NULLIF(trim(a.rule_prize_unit), ''), NULLIF(trim(r.prize_unit), ''), '') AS "prizeUnit",
       a.item_fulfillment_mode AS "itemFulfillmentMode",
       COALESCE(
         NULLIF(BTRIM(COALESCE(a.prize_fulfillment_mode::text, '')), ''),
         NULLIF(BTRIM(COALESCE(r.prize_fulfillment_mode::text, '')), '')
       ) AS "prizeFulfillmentMode",
       a.item_fulfillment_status AS "itemFulfillmentStatus",
       a.item_fulfillment_note AS "itemFulfillmentNote",
       a.item_tracking_code AS "itemTrackingCode",
       a.item_resolved_at AS "itemResolvedAt",
       u.id AS "winnerUserId",
       u.username AS "winnerUsername",
       u.first_name AS "winnerFirstName",
       u.last_name AS "winnerLastName",
       COALESCE(u.red_hearts_balance, 0) AS "winnerRedHeartsBalance"
     FROM central_prize_awards a
     JOIN users u ON u.id = a.winner_user_id
     LEFT JOIN central_games g ON g.id = a.game_id
     LEFT JOIN users cu ON cu.id = g.created_by
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
    creatorUsername:
      row.creatorUsername != null ? String(row.creatorUsername).trim().toLowerCase() : "",
    ruleId: row.ruleId != null ? String(row.ruleId) : null,
    setIndex: Math.max(0, Math.floor(Number(row.setIndex)) || 0),
    prizeTitle: row.prizeTitle != null ? String(row.prizeTitle).trim() : "",
    prizeValueText: row.prizeValueText != null ? String(row.prizeValueText).trim() : "",
    prizeUnit: row.prizeUnit != null ? String(row.prizeUnit).trim() : "",
    itemFulfillmentMode:
      row.itemFulfillmentMode != null ? String(row.itemFulfillmentMode).trim().toLowerCase() : "",
    prizeFulfillmentMode: fulfillmentFromRuleRow({
      prize_category: row.prizeCategory,
      prize_fulfillment_mode: row.prizeFulfillmentMode
    }),
    itemFulfillmentStatus:
      row.itemFulfillmentStatus != null
        ? String(row.itemFulfillmentStatus).trim().toLowerCase()
        : "pending_creator",
    itemFulfillmentNote:
      row.itemFulfillmentNote != null ? String(row.itemFulfillmentNote).trim() : "",
    itemTrackingCode: row.itemTrackingCode != null ? String(row.itemTrackingCode).trim() : "",
    itemResolvedAt: row.itemResolvedAt || null,
    winnerUserId: String(row.winnerUserId),
    winnerUsername: row.winnerUsername != null ? String(row.winnerUsername).trim() : "",
    winnerFirstName: row.winnerFirstName != null ? String(row.winnerFirstName).trim() : "",
    winnerLastName: row.winnerLastName != null ? String(row.winnerLastName).trim() : "",
    winnerRedHeartsBalance: Math.max(0, Math.floor(Number(row.winnerRedHeartsBalance) || 0))
  }));
}

/**
 * รายชื่อผู้ได้รับรางวัลจากเกมที่ฉันเป็นผู้สร้าง
 * @param {string} creatorUserId
 * @param {{ limit?: number }} [opts]
 */
async function listAwardsForCreator(creatorUserId, opts = {}) {
  if (!creatorUserId) return [];
  const pool = requirePool();
  const lim = Math.min(5000, Math.max(1, Math.floor(Number(opts.limit) || 1000)));
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
       a.item_fulfillment_mode AS "itemFulfillmentMode",
       COALESCE(
         NULLIF(BTRIM(COALESCE(a.prize_fulfillment_mode::text, '')), ''),
         NULLIF(BTRIM(COALESCE(r.prize_fulfillment_mode::text, '')), '')
       ) AS "prizeFulfillmentMode",
       a.item_fulfillment_status AS "itemFulfillmentStatus",
       a.item_fulfillment_note AS "itemFulfillmentNote",
       a.item_tracking_code AS "itemTrackingCode",
       a.item_shipping_address_snapshot AS "itemShippingAddressSnapshot",
       a.item_resolved_at AS "itemResolvedAt",
       u.id AS "winnerUserId",
       u.username AS "winnerUsername",
       u.first_name AS "winnerFirstName",
       u.last_name AS "winnerLastName",
       u.phone AS "winnerPhone",
       u.shipping_address AS "winnerShippingAddress",
       u.shipping_house_no AS "winnerShippingHouseNo",
       u.shipping_moo AS "winnerShippingMoo",
       u.shipping_road AS "winnerShippingRoad",
       u.shipping_subdistrict AS "winnerShippingSubdistrict",
       u.shipping_district AS "winnerShippingDistrict",
       u.shipping_province AS "winnerShippingProvince",
       u.shipping_postal_code AS "winnerShippingPostalCode"
     FROM central_prize_awards a
     JOIN central_games g ON g.id = a.game_id
     JOIN users u ON u.id = a.winner_user_id
     LEFT JOIN central_game_rules r ON r.id = a.rule_id
     WHERE g.created_by = $1::uuid
       AND a.prize_category IS DISTINCT FROM 'none'
     ORDER BY a.created_at DESC
     LIMIT $2`,
    [creatorUserId, lim]
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
    itemFulfillmentMode:
      row.itemFulfillmentMode != null ? String(row.itemFulfillmentMode).trim().toLowerCase() : "",
    prizeFulfillmentMode: fulfillmentFromRuleRow({
      prize_category: row.prizeCategory,
      prize_fulfillment_mode: row.prizeFulfillmentMode
    }),
    itemFulfillmentStatus:
      row.itemFulfillmentStatus != null
        ? String(row.itemFulfillmentStatus).trim().toLowerCase()
        : "pending_creator",
    itemFulfillmentNote:
      row.itemFulfillmentNote != null ? String(row.itemFulfillmentNote).trim() : "",
    itemTrackingCode: row.itemTrackingCode != null ? String(row.itemTrackingCode).trim() : "",
    itemShippingAddressSnapshot:
      row.itemShippingAddressSnapshot && typeof row.itemShippingAddressSnapshot === "object"
        ? row.itemShippingAddressSnapshot
        : null,
    itemResolvedAt: row.itemResolvedAt || null,
    winnerUserId: String(row.winnerUserId),
    winnerUsername: row.winnerUsername != null ? String(row.winnerUsername).trim() : "",
    winnerFirstName: row.winnerFirstName != null ? String(row.winnerFirstName).trim() : "",
    winnerLastName: row.winnerLastName != null ? String(row.winnerLastName).trim() : "",
    winnerPhone: row.winnerPhone != null ? String(row.winnerPhone).trim() : "",
    winnerShippingAddress:
      row.winnerShippingAddress != null ? String(row.winnerShippingAddress).trim() : "",
    winnerShippingParts: {
      houseNo: row.winnerShippingHouseNo != null ? String(row.winnerShippingHouseNo).trim() : "",
      moo: row.winnerShippingMoo != null ? String(row.winnerShippingMoo).trim() : "",
      road: row.winnerShippingRoad != null ? String(row.winnerShippingRoad).trim() : "",
      subdistrict:
        row.winnerShippingSubdistrict != null ? String(row.winnerShippingSubdistrict).trim() : "",
      district: row.winnerShippingDistrict != null ? String(row.winnerShippingDistrict).trim() : "",
      province: row.winnerShippingProvince != null ? String(row.winnerShippingProvince).trim() : "",
      postalCode:
        row.winnerShippingPostalCode != null ? String(row.winnerShippingPostalCode).trim() : ""
    }
  }));
}

async function resolveItemAwardByCreator({
  awardId,
  creatorUserId,
  mode,
  status,
  note,
  trackingCode
}) {
  const m = normalizeItemMode(mode);
  const s = normalizeItemStatus(status);
  if (!m || !s) {
    const e = new Error("ข้อมูลสถานะรางวัลสิ่งของไม่ถูกต้อง");
    e.code = "VALIDATION";
    throw e;
  }
  if (m === "pickup" && s === "shipped") {
    const e = new Error("นัดรับเองไม่สามารถเป็นสถานะจัดส่งแล้ว");
    e.code = "VALIDATION";
    throw e;
  }
  if (m === "ship" && !["pending_creator", "shipped", "completed"].includes(s)) {
    const e = new Error("โหมดจัดส่งรองรับสถานะ รอผู้สร้าง/จัดส่งแล้ว/รับเรียบร้อย");
    e.code = "VALIDATION";
    throw e;
  }
  const pool = requirePool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await client.query(
      `SELECT
         a.id, a.prize_category, a.winner_user_id, a.status,
         g.created_by AS creator_user_id,
         u.username AS winner_username, u.phone AS winner_phone,
         u.shipping_address, u.shipping_house_no, u.shipping_moo, u.shipping_road,
         u.shipping_subdistrict, u.shipping_district, u.shipping_province, u.shipping_postal_code
       FROM central_prize_awards a
       JOIN central_games g ON g.id = a.game_id
       JOIN users u ON u.id = a.winner_user_id
       WHERE a.id = $1::uuid
       FOR UPDATE`,
      [awardId]
    );
    if (r.rows.length === 0) {
      const e = new Error("ไม่พบรายการรางวัล");
      e.code = "NOT_FOUND";
      throw e;
    }
    const row = r.rows[0];
    if (String(row.creator_user_id) !== String(creatorUserId)) {
      const e = new Error("ไม่มีสิทธิ์จัดการรางวัลนี้");
      e.code = "FORBIDDEN";
      throw e;
    }
    if (String(row.prize_category) !== "item") {
      const e = new Error("รายการนี้ไม่ใช่รางวัลสิ่งของ");
      e.code = "VALIDATION";
      throw e;
    }
    const shippingSnapshot =
      m === "ship"
        ? {
            username: row.winner_username != null ? String(row.winner_username).trim() : "",
            phone: row.winner_phone != null ? String(row.winner_phone).trim() : "",
            address: row.shipping_address != null ? String(row.shipping_address).trim() : "",
            parts: {
              houseNo: row.shipping_house_no != null ? String(row.shipping_house_no).trim() : "",
              moo: row.shipping_moo != null ? String(row.shipping_moo).trim() : "",
              road: row.shipping_road != null ? String(row.shipping_road).trim() : "",
              subdistrict:
                row.shipping_subdistrict != null ? String(row.shipping_subdistrict).trim() : "",
              district: row.shipping_district != null ? String(row.shipping_district).trim() : "",
              province: row.shipping_province != null ? String(row.shipping_province).trim() : "",
              postalCode:
                row.shipping_postal_code != null ? String(row.shipping_postal_code).trim() : ""
            }
          }
        : null;
    await client.query(
      `UPDATE central_prize_awards
       SET
         item_fulfillment_mode = $2,
         prize_fulfillment_mode = $2,
         item_fulfillment_status = $3,
         item_fulfillment_note = $4,
         item_tracking_code = $5,
         item_shipping_address_snapshot = $6::jsonb,
         item_resolved_at = NOW(),
         updated_at = NOW()
       WHERE id = $1::uuid`,
      [
        awardId,
        m,
        s,
        note != null && String(note).trim() ? String(note).trim().slice(0, 1000) : null,
        trackingCode != null && String(trackingCode).trim()
          ? String(trackingCode).trim().slice(0, 120)
          : null,
        shippingSnapshot
      ]
    );
    await client.query("COMMIT");
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
  return true;
}

module.exports = {
  countAwardsByRuleForGame,
  tryRecordWin,
  listPublicRecipientsForRule,
  listAwardsForUser,
  listAllAwardsForAdmin,
  listAwardsForCreator,
  resolveItemAwardByCreator
};
