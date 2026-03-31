const crypto = require("crypto");
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

/** URL รูปภาพ (ว่าง = ไม่ตั้ง) — ต้อง http(s) */
function normalizeHttpImageUrl(raw, label) {
  if (raw == null) return null;
  const s = String(raw).trim().slice(0, 2000);
  if (!s) return null;
  if (!s.startsWith("http://") && !s.startsWith("https://")) {
    const e = new Error(`${label}ต้องเป็น URL (http/https)`);
    e.code = "VALIDATION";
    throw e;
  }
  return s;
}

function normalizeTileBackCoverUrl(raw) {
  return normalizeHttpImageUrl(raw, "ภาพหน้าป้าย");
}

function normalizeGameCoverUrl(raw) {
  return normalizeHttpImageUrl(raw, "รูปหน้าปกเกม");
}

/** @returns {number[]} ความยาว = setCount แต่ละชุดมีกี่ภาพ */
function normalizeSetImageCounts(setCount, rawJson, imagesPerSetFallback) {
  const sc = Math.max(1, Math.floor(Number(setCount) || 0));
  const fb = Math.max(1, Math.floor(Number(imagesPerSetFallback) || 1));
  let arr = null;
  if (rawJson != null) {
    if (typeof rawJson === "string") {
      try {
        arr = JSON.parse(rawJson);
      } catch {
        arr = null;
      }
    } else if (Array.isArray(rawJson)) {
      arr = rawJson;
    }
  }
  if (!Array.isArray(arr) || arr.length === 0) {
    return Array.from({ length: sc }, () => fb);
  }
  const nums = arr.map((x) => Math.max(1, Math.floor(Number(x)) || 1));
  if (nums.length >= sc) {
    return nums.slice(0, sc);
  }
  const out = nums.slice();
  const pad = out.length ? out[out.length - 1] : fb;
  while (out.length < sc) out.push(pad);
  return out;
}

function sumSizes(sizes) {
  return sizes.reduce((a, b) => a + b, 0);
}

/** รายละเอียดเกม (ข้อความยาว) — ว่างได้ */
function normalizeGameDescription(raw) {
  if (raw == null) return "";
  return String(raw).trim().slice(0, 8000);
}

/** ค.ศ. วันนี้ในเขต Asia/Bangkok → YYYYMMDD (สำหรับรหัสเกม) */
function bangkokDatePrefix() {
  const s = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
  const compact = String(s).replace(/-/g, "");
  if (/^\d{8}$/.test(compact)) return compact;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;
    if (y && m && d) return `${y}${m.padStart(2, "0")}${d.padStart(2, "0")}`;
  } catch {
    /* fall through */
  }
  return compact;
}

/**
 * กำหนด game_code ครั้งแรกเมื่อเผยแพร่ — รูปแบบ YYYYMMDD + ลำดับในวันนั้น (01, 02, …)
 * ต้องอยู่ใน transaction แล้วส่ง client เดียวกัน
 */
async function assignGameCodeIfMissingTx(client, gameId) {
  const row = await client.query(
    `SELECT game_code FROM central_games WHERE id = $1 FOR UPDATE`,
    [gameId]
  );
  const existing = row.rows[0]?.game_code;
  if (existing != null && String(existing).trim() !== "") return;

  const prefix = bangkokDatePrefix();
  if (prefix.length !== 8 || !/^\d{8}$/.test(prefix)) {
    const e = new Error("ไม่สามารถสร้างรหัสเกมได้ (รูปแบบวันที่)");
    e.code = "VALIDATION";
    throw e;
  }

  await client.query(`SELECT pg_advisory_xact_lock($1::bigint)`, [
    parseInt(prefix, 10) % 2147483647 || 1
  ]);

  const maxR = await client.query(
    `SELECT COALESCE(MAX(
       CAST(SUBSTRING(game_code FROM 9) AS INTEGER)
     ), 0) AS m
     FROM central_games
     WHERE game_code IS NOT NULL
       AND LENGTH(game_code) > 8
       AND LEFT(game_code, 8) = $1
       AND SUBSTRING(game_code FROM 9) ~ '^[0-9]+$'`,
    [prefix]
  );
  const next = Math.max(0, parseInt(maxR.rows[0]?.m, 10) || 0) + 1;
  if (next > 999999) {
    const e = new Error("เกินจำนวนรหัสเกมที่ออกได้ในวันนี้");
    e.code = "VALIDATION";
    throw e;
  }
  const suffix = next < 100 ? String(next).padStart(2, "0") : String(next);
  const candidate = `${prefix}${suffix}`;

  const up = await client.query(
    `UPDATE central_games SET game_code = $2 WHERE id = $1 AND (game_code IS NULL OR TRIM(game_code) = '')`,
    [gameId, candidate]
  );
  if (up.rowCount === 0) {
    const chk = await client.query(`SELECT game_code FROM central_games WHERE id = $1`, [gameId]);
    if (!chk.rows[0]?.game_code || !String(chk.rows[0].game_code).trim()) {
      const e = new Error("ไม่สามารถกำหนดรหัสเกมได้");
      e.code = "VALIDATION";
      throw e;
    }
  }
}

async function ensurePublishedGameCode(gameId) {
  const pool = requirePool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await assignGameCodeIfMissingTx(client, gameId);
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
}

const HEART_CURRENCY_MODES = new Set(["both", "pink_only", "red_only", "either"]);

function normalizeHeartCurrencyMode(raw) {
  const m = String(raw || "").trim().toLowerCase().replace(/-/g, "_");
  if (HEART_CURRENCY_MODES.has(m)) return m;
  return "both";
}

function rowGame(row) {
  const legacyHeart = Math.max(0, Math.floor(Number(row.heart_cost) || 0));
  let pinkHeartCost = Math.max(0, Math.floor(Number(row.pink_heart_cost) || 0));
  let redHeartCost = Math.max(0, Math.floor(Number(row.red_heart_cost) || 0));
  if (pinkHeartCost === 0 && redHeartCost === 0 && legacyHeart > 0) {
    pinkHeartCost = legacyHeart;
  }
  const setCount = Math.max(1, Math.floor(Number(row.set_count) || 0));
  const imagesPerSetCol = Math.max(1, Math.floor(Number(row.images_per_set) || 1));
  const setImageCounts = normalizeSetImageCounts(
    setCount,
    row.set_image_counts,
    imagesPerSetCol
  );
  const tileCount = Math.max(1, Math.floor(Number(row.tile_count) || 0));
  const imagesPerSet = Math.max(...setImageCounts, 1);
  return {
    id: row.id,
    title: row.title,
    description: normalizeGameDescription(row.description),
    tileCount,
    setCount,
    setImageCounts,
    imagesPerSet,
    pinkHeartCost,
    redHeartCost,
    heartCost: pinkHeartCost + redHeartCost,
    isActive: Boolean(row.is_active),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tileBackCoverUrl:
      row.tile_back_cover_url != null && String(row.tile_back_cover_url).trim()
        ? String(row.tile_back_cover_url).trim()
        : null,
    gameCoverUrl:
      row.game_cover_url != null && String(row.game_cover_url).trim()
        ? String(row.game_cover_url).trim()
        : null,
    isPublished: Boolean(row.is_published),
    gameCode:
      row.game_code != null && String(row.game_code).trim()
        ? String(row.game_code).trim()
        : null,
    creatorUsername:
      row.creator_username != null && String(row.creator_username).trim()
        ? String(row.creator_username).trim().toLowerCase()
        : null,
    allowGiftRedPlay: Boolean(row.allow_gift_red_play),
    heartCurrencyMode: normalizeHeartCurrencyMode(row.heart_currency_mode),
    acceptsPinkHearts:
      row.accepts_pink_hearts == null ? true : Boolean(row.accepts_pink_hearts)
  };
}

function rowRule(row) {
  return {
    id: row.id,
    gameId: row.game_id,
    sortOrder: Math.floor(Number(row.sort_order) || 0),
    setIndex: row.set_index,
    needCount: row.need_count,
    prizeCategory: row.prize_category,
    prizeTitle: row.prize_title || "",
    prizeValueText: row.prize_value_text || "",
    prizeUnit: row.prize_unit || "",
    description: row.description || "",
    prizeTotalQty:
      row.prize_category === "none"
        ? null
        : row.prize_total_qty == null
          ? 1
          : Math.max(1, Math.floor(Number(row.prize_total_qty)) || 1)
  };
}

/** snapshot สำหรับสร้าง session — รวม lookup รูป */
async function getGameSnapshotById(gameId) {
  const pool = requirePool();
  const g = await pool.query(
    `SELECT g.*, u.username AS creator_username
     FROM central_games g
     LEFT JOIN users u ON u.id = g.created_by
     WHERE g.id = $1`,
    [gameId]
  );
  if (g.rows.length === 0) return null;
  const game = rowGame(g.rows[0]);
  const img = await pool.query(
    `SELECT set_index, image_index, image_url FROM central_game_images WHERE game_id = $1`,
    [gameId]
  );
  const imageUrl = new Map();
  for (const r of img.rows) {
    imageUrl.set(`${r.set_index}-${r.image_index}`, r.image_url);
  }
  const rulesR = await pool.query(
    `SELECT * FROM central_game_rules WHERE game_id = $1 ORDER BY sort_order ASC, id ASC`,
    [gameId]
  );
  const rules = rulesR.rows.map(rowRule);
  return { game, imageUrl, rules };
}

async function getActiveGameSnapshot() {
  const pool = requirePool();
  const g = await pool.query(
    `SELECT * FROM central_games WHERE is_active = TRUE LIMIT 1`
  );
  if (g.rows.length === 0) return null;
  return getGameSnapshotById(g.rows[0].id);
}

/** แสดงในหน้าเกม: เผยแพร่แล้ว หรือเป็นเกมที่กำลังเปิดใช้ (รองรับข้อมูลเก่าก่อนมีคอลัมน์ is_published) */
async function listPublishedGamesForPublic() {
  const pool = requirePool();
  const r = await pool.query(
    `SELECT g.*, u.username AS creator_username
     FROM central_games g
     LEFT JOIN users u ON u.id = g.created_by
     WHERE g.is_published = TRUE OR g.is_active = TRUE
     ORDER BY g.updated_at DESC NULLS LAST, g.created_at DESC`
  );
  return r.rows.map((row) => {
    const game = rowGame(row);
    return {
      id: game.id,
      title: game.title,
      description: game.description,
      gameCoverUrl: game.gameCoverUrl,
      creatorUsername: game.creatorUsername,
      pinkHeartCost: game.pinkHeartCost,
      redHeartCost: game.redHeartCost,
      heartCurrencyMode: game.heartCurrencyMode,
      acceptsPinkHearts: game.acceptsPinkHearts
    };
  });
}

/** snapshot สำหรับเล่นเมื่อเกมอยู่ในรายการสาธารณะ (เผยแพร่หรือกำลัง active) */
async function getPublishedGameSnapshotById(gameId) {
  const pool = requirePool();
  const g = await pool.query(
    `SELECT id FROM central_games WHERE id = $1 AND (is_published = TRUE OR is_active = TRUE)`,
    [gameId]
  );
  if (g.rows.length === 0) return null;
  return getGameSnapshotById(gameId);
}

/**
 * @param {{ creatorId?: string | null }} [options] — ถ้าระบุ จะคืนเฉพาะเกมที่ created_by ตรงกับผู้ใช้ (สำหรับผู้สร้างที่ไม่ใช่แอดมิน)
 */
async function listGamesForAdmin(options = {}) {
  const pool = requirePool();
  const creatorId =
    options.creatorId != null && String(options.creatorId).trim() !== ""
      ? String(options.creatorId).trim()
      : null;
  const where = creatorId ? " WHERE g.created_by = $1" : "";
  const params = creatorId ? [creatorId] : [];
  const r = await pool.query(
    `SELECT g.*,
      COALESCE(pa.c, 0)::int AS prize_award_count
     FROM central_games g
     LEFT JOIN (
       SELECT game_id, COUNT(*)::int AS c
       FROM central_prize_awards
       GROUP BY game_id
     ) pa ON pa.game_id = g.id
     ${where}
     ORDER BY g.updated_at DESC NULLS LAST, g.created_at DESC`,
    params
  );
  return r.rows.map((row) => ({
    ...rowGame(row),
    prizeAwardCount: Math.max(0, Math.floor(Number(row.prize_award_count)) || 0)
  }));
}

/** จำนวนแถวรางวัลที่บันทึกแล้ว — ใช้บล็อกลบเกม */
async function getPrizeAwardCountForGame(gameId) {
  const pool = requirePool();
  const r = await pool.query(
    `SELECT COUNT(*)::int AS n FROM central_prize_awards WHERE game_id = $1`,
    [gameId]
  );
  return Math.max(0, Math.floor(Number(r.rows[0]?.n)) || 0);
}

/** จำนวนรับรางวัลแยกรายกติกา */
async function getPrizeAwardCountByRule(gameId) {
  const pool = requirePool();
  const r = await pool.query(
    `SELECT rule_id::text AS rid, COUNT(*)::int AS c
     FROM central_prize_awards
     WHERE game_id = $1::uuid AND rule_id IS NOT NULL
     GROUP BY rule_id`,
    [gameId]
  );
  const out = {};
  for (const row of r.rows) {
    const k = String(row.rid || "").trim().toLowerCase();
    if (!k) continue;
    out[k] = Math.max(0, Math.floor(Number(row.c)) || 0);
  }
  return out;
}

function normalizePinkRedCosts(body, fallbackPink = 0, fallbackRed = 0) {
  let pink = Math.max(0, Math.floor(Number(body?.pinkHeartCost) || 0));
  let red = Math.max(0, Math.floor(Number(body?.redHeartCost) || 0));
  if (
    pink === 0 &&
    red === 0 &&
    body?.heartCost != null &&
    Math.floor(Number(body.heartCost) || 0) > 0
  ) {
    pink = Math.max(0, Math.floor(Number(body.heartCost) || 0));
    red = 0;
  }
  if (body?.pinkHeartCost == null && body?.redHeartCost == null && body?.heartCost == null) {
    pink = fallbackPink;
    red = fallbackRed;
  }
  return { pink, red };
}

/**
 * @param {string} modeRaw
 * @param {boolean} acceptsPink
 */
function syncCostsForCurrencyMode(modeRaw, pink, red, acceptsPink) {
  const mode = normalizeHeartCurrencyMode(modeRaw);
  let p = Math.max(0, Math.floor(Number(pink) || 0));
  let r = Math.max(0, Math.floor(Number(red) || 0));
  if (mode === "pink_only") {
    r = 0;
  } else if (mode === "red_only") {
    p = 0;
  } else if (mode === "either") {
    const fee = Math.max(p, r);
    if (acceptsPink !== false) {
      p = fee;
      r = fee;
    } else {
      p = 0;
      r = fee;
    }
  }
  return { mode, pink: p, red: r, heartSum: p + r };
}

/**
 * @param {{ heartCurrencyMode?: string; pinkHeartCost?: number; redHeartCost?: number; acceptsPinkHearts?: boolean }} g
 */
function assertHeartEconomyValid(g) {
  const mode = normalizeHeartCurrencyMode(g?.heartCurrencyMode);
  const pink = Math.max(0, Math.floor(Number(g?.pinkHeartCost) || 0));
  const red = Math.max(0, Math.floor(Number(g?.redHeartCost) || 0));
  const accepts = g?.acceptsPinkHearts !== false;
  if (!accepts && pink > 0) {
    const e = new Error("ปิดรับหัวใจชมพูแล้ว — ตั้งค่าหัวใจชมพูต่อรอบเป็น 0");
    e.code = "VALIDATION";
    throw e;
  }
  if (!accepts && mode === "pink_only") {
    const e = new Error("ห้องที่ไม่รับชมพูต้องไม่ใช้โหมดชำระเฉพาะชมพู");
    e.code = "VALIDATION";
    throw e;
  }
  if (mode === "pink_only" && pink <= 0) {
    const e = new Error("โหมดชำระเฉพาะชมพู — ต้องกำหนดจำนวนชมพูต่อรอบ");
    e.code = "VALIDATION";
    throw e;
  }
  if (mode === "red_only" && red <= 0) {
    const e = new Error("โหมดชำระเฉพาะแดง — ต้องกำหนดจำนวนแดงต่อรอบ");
    e.code = "VALIDATION";
    throw e;
  }
  if (mode === "either") {
    const fee = Math.max(pink, red);
    if (fee <= 0) {
      const e = new Error("โหมดจ่ายชมพูหรือแดงอย่างใดอย่างหนึ่ง — ต้องกำหนดจำนวนต่อรอบ > 0");
      e.code = "VALIDATION";
      throw e;
    }
    if (accepts && pink !== red) {
      const e = new Error("โหมดจ่ายอย่างใดอย่างหนึ่ง — ใส่ชมพูและแดงให้เท่ากัน (ค่าธรรมเนียมเดียวกัน)");
      e.code = "VALIDATION";
      throw e;
    }
  }
  if (mode === "both" && pink + red <= 0) {
    const e = new Error("โหมดหักทั้งชมพูและแดง — ต้องกำหนดอย่างน้อยหนึ่งยอด");
    e.code = "VALIDATION";
    throw e;
  }
}

async function createGame({
  title,
  description: descriptionBody,
  tileCount,
  setCount,
  imagesPerSet,
  setImageCounts: setImageCountsBody,
  heartCost = 0,
  pinkHeartCost,
  redHeartCost,
  heartCurrencyMode: heartCurrencyModeBody,
  acceptsPinkHearts: acceptsPinkBody,
  tileBackCoverUrl,
  gameCoverUrl: gameCoverUrlBody,
  createdBy = null
}) {
  const pool = requirePool();
  const t = String(title || "").trim().slice(0, 200);
  const sc = Math.max(1, Math.floor(Number(setCount) || 0));
  const m = Math.max(1, Math.floor(Number(imagesPerSet) || 0));
  let sizes;
  if (Array.isArray(setImageCountsBody) && setImageCountsBody.length > 0) {
    sizes = normalizeSetImageCounts(sc, setImageCountsBody, m);
  } else {
    sizes = Array.from({ length: sc }, () => m);
  }
  if (!t) {
    const e = new Error("ต้องมีชื่อเกม");
    e.code = "VALIDATION";
    throw e;
  }
  const tc = sumSizes(sizes);
  if (tileCount != null && Math.floor(Number(tileCount) || 0) !== tc) {
    const e = new Error(`จำนวนป้ายรวมต้องเท่ากับ ${tc} (ผลรวมภาพแต่ละชุด)`);
    e.code = "VALIDATION";
    throw e;
  }
  if (sc < 1 || tc < 1) {
    const e = new Error("จำนวนชุดและป้ายรวมต้องมากกว่า 0");
    e.code = "VALIDATION";
    throw e;
  }
  const maxPer = Math.max(...sizes, 1);
  const id = crypto.randomUUID();
  let { pink, red } = normalizePinkRedCosts(
    { heartCost, pinkHeartCost, redHeartCost },
    0,
    0
  );
  const acceptsPink =
    acceptsPinkBody !== undefined ? Boolean(acceptsPinkBody) : true;
  const mode = normalizeHeartCurrencyMode(heartCurrencyModeBody);
  const synced = syncCostsForCurrencyMode(mode, pink, red, acceptsPink);
  pink = synced.pink;
  red = synced.red;
  const heartSum = synced.heartSum;
  assertHeartEconomyValid({
    heartCurrencyMode: mode,
    pinkHeartCost: pink,
    redHeartCost: red,
    acceptsPinkHearts: acceptsPink
  });
  const gameDesc = normalizeGameDescription(descriptionBody);
  let gcv = null;
  if (gameCoverUrlBody !== undefined && gameCoverUrlBody !== null && String(gameCoverUrlBody).trim()) {
    gcv = normalizeGameCoverUrl(gameCoverUrlBody);
  }
  await pool.query(
    `INSERT INTO central_games (
       id, title, description, tile_count, set_count, images_per_set, set_image_counts,
       heart_cost, pink_heart_cost, red_heart_cost, game_cover_url, is_active, created_by,
       heart_currency_mode, accepts_pink_hearts
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, FALSE, $12, $13, $14)`,
    [id, t, gameDesc, tc, sc, maxPer, JSON.stringify(sizes), heartSum, pink, red, gcv, createdBy, mode, acceptsPink]
  );
  return getGameSnapshotById(id);
}

async function updateGameMeta(gameId, patch, options = {}) {
  const pool = requirePool();
  const cur = await pool.query(`SELECT * FROM central_games WHERE id = $1`, [gameId]);
  if (cur.rows.length === 0) return null;
  const c = rowGame(cur.rows[0]);
  const awardCountEarly = await getPrizeAwardCountForGame(gameId);
  const title = patch.title != null ? String(patch.title).trim().slice(0, 200) : c.title;
  const sc = patch.setCount != null ? Math.max(1, Math.floor(Number(patch.setCount) || 0)) : c.setCount;
  let sizes;
  if (Array.isArray(patch.setImageCounts) && patch.setImageCounts.length > 0) {
    sizes = normalizeSetImageCounts(sc, patch.setImageCounts, c.imagesPerSet);
  } else if (
    patch.imagesPerSet != null &&
    patch.setImageCounts == null
  ) {
    const m = Math.max(1, Math.floor(Number(patch.imagesPerSet) || 0));
    sizes = Array.from({ length: sc }, () => m);
  } else {
    sizes = normalizeSetImageCounts(sc, c.setImageCounts, c.imagesPerSet);
  }
  const tc = sumSizes(sizes);
  if (patch.tileCount != null && Math.floor(Number(patch.tileCount) || 0) !== tc) {
    const e = new Error(`จำนวนป้ายรวมต้องเท่ากับ ${tc} (ผลรวมภาพแต่ละชุด)`);
    e.code = "VALIDATION";
    throw e;
  }
  const maxPer = Math.max(...sizes, 1);
  let pink = c.pinkHeartCost;
  let red = c.redHeartCost;
  if (patch.pinkHeartCost != null) {
    pink = Math.max(0, Math.floor(Number(patch.pinkHeartCost) || 0));
  }
  if (patch.redHeartCost != null) {
    red = Math.max(0, Math.floor(Number(patch.redHeartCost) || 0));
  }
  if (
    patch.heartCost != null &&
    patch.pinkHeartCost == null &&
    patch.redHeartCost == null
  ) {
    pink = Math.max(0, Math.floor(Number(patch.heartCost) || 0));
    red = 0;
  }
  const mode =
    patch.heartCurrencyMode != null
      ? normalizeHeartCurrencyMode(patch.heartCurrencyMode)
      : c.heartCurrencyMode;
  const acceptsPink =
    patch.acceptsPinkHearts !== undefined
      ? Boolean(patch.acceptsPinkHearts)
      : c.acceptsPinkHearts !== false;
  const synced = syncCostsForCurrencyMode(mode, pink, red, acceptsPink);
  pink = synced.pink;
  red = synced.red;
  const heartSum = synced.heartSum;
  assertHeartEconomyValid({
    heartCurrencyMode: mode,
    pinkHeartCost: pink,
    redHeartCost: red,
    acceptsPinkHearts: acceptsPink
  });
  if (!title) {
    const e = new Error("ต้องมีชื่อเกม");
    e.code = "VALIDATION";
    throw e;
  }
  const description =
    patch.description !== undefined
      ? normalizeGameDescription(patch.description)
      : normalizeGameDescription(cur.rows[0].description);
  const allowUnsafeEdit = Boolean(options.allowUnsafeEdit);
  if (awardCountEarly > 0 && !allowUnsafeEdit) {
    const sameLayout =
      sc === c.setCount &&
      tc === c.tileCount &&
      JSON.stringify(sizes) === JSON.stringify(c.setImageCounts) &&
      pink === c.pinkHeartCost &&
      red === c.redHeartCost &&
      mode === c.heartCurrencyMode &&
      acceptsPink === (c.acceptsPinkHearts !== false);
    if (!sameLayout) {
      const e = new Error(MSG_AWARDS_LOCK);
      e.code = "VALIDATION";
      throw e;
    }
  }
  const extraFragments = [];
  const params = [
    gameId,
    title,
    tc,
    sc,
    maxPer,
    JSON.stringify(sizes),
    heartSum,
    pink,
    red,
    description,
    mode,
    acceptsPink
  ];
  if (patch.tileBackCoverUrl !== undefined) {
    const v =
      patch.tileBackCoverUrl === null || patch.tileBackCoverUrl === ""
        ? null
        : normalizeTileBackCoverUrl(patch.tileBackCoverUrl);
    params.push(v);
    extraFragments.push(`tile_back_cover_url = $${params.length}`);
  }
  if (patch.gameCoverUrl !== undefined) {
    const v =
      patch.gameCoverUrl === null || patch.gameCoverUrl === ""
        ? null
        : normalizeGameCoverUrl(patch.gameCoverUrl);
    params.push(v);
    extraFragments.push(`game_cover_url = $${params.length}`);
  }
  if (patch.isPublished !== undefined) {
    const want = Boolean(patch.isPublished);
    if (want) {
      const snap = await getGameSnapshotById(gameId);
      await assertGamePlayable(snap);
    }
    params.push(want);
    extraFragments.push(`is_published = $${params.length}`);
  }
  if (patch.allowGiftRedPlay !== undefined) {
    params.push(Boolean(patch.allowGiftRedPlay));
    extraFragments.push(`allow_gift_red_play = $${params.length}`);
  }
  const extraSql = extraFragments.length ? `, ${extraFragments.join(", ")}` : "";
  await pool.query(
    `UPDATE central_games SET title = $2, tile_count = $3, set_count = $4, images_per_set = $5, set_image_counts = $6::jsonb, heart_cost = $7, pink_heart_cost = $8, red_heart_cost = $9, description = $10, heart_currency_mode = $11, accepts_pink_hearts = $12, updated_at = NOW()${extraSql} WHERE id = $1`,
    params
  );
  const publishedAfter =
    (patch.isPublished !== undefined ? Boolean(patch.isPublished) : Boolean(c.isPublished)) ||
    Boolean(c.isActive);
  if (publishedAfter) {
    await ensurePublishedGameCode(gameId);
  }
  return getGameSnapshotById(gameId);
}

async function replaceImages(gameId, images, options = {}) {
  const pool = requirePool();
  const snap = await getGameSnapshotById(gameId);
  if (!snap) {
    const e = new Error("ไม่พบเกม");
    e.code = "NOT_FOUND";
    throw e;
  }
  const allowUnsafeEdit = Boolean(options.allowUnsafeEdit);
  const imgAwardCount = await getPrizeAwardCountForGame(gameId);
  if (imgAwardCount > 0 && !allowUnsafeEdit) {
    const e = new Error(
      "มีผู้ได้รับรางวัลจากเกมนี้แล้ว — ไม่สามารถเปลี่ยนชุดรูปป้ายได้"
    );
    e.code = "VALIDATION";
    throw e;
  }
  const { setCount, setImageCounts } = snap.game;
  if (!Array.isArray(images)) {
    const e = new Error("images ต้องเป็นอาร์เรย์");
    e.code = "VALIDATION";
    throw e;
  }
  const oneImagePerSet = Boolean(options.oneImagePerSet);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM central_game_images WHERE game_id = $1`, [gameId]);

    if (oneImagePerSet) {
      if (images.length !== setCount) {
        const e = new Error(`ต้องส่งรูปครบทุกชุด (${setCount} ชุด) — ชุดละ 1 ไฟล์`);
        e.code = "VALIDATION";
        throw e;
      }
      const bySet = new Map();
      for (const row of images) {
        const si = Math.floor(Number(row.setIndex));
        const url = String(row.imageUrl || "").trim().slice(0, 2000);
        if (si < 0 || si >= setCount) {
          const e = new Error(`setIndex ${si} อยู่นอกช่วง`);
          e.code = "VALIDATION";
          throw e;
        }
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          const e = new Error("ต้องเป็น URL รูป (http/https)");
          e.code = "VALIDATION";
          throw e;
        }
        if (bySet.has(si)) {
          const e = new Error(`ชุด ${si + 1} ซ้ำในรายการรูป`);
          e.code = "VALIDATION";
          throw e;
        }
        bySet.set(si, url);
      }
      for (let s = 0; s < setCount; s += 1) {
        if (!bySet.has(s)) {
          const e = new Error(`ขาดรูปสำหรับชุด ${s + 1}`);
          e.code = "VALIDATION";
          throw e;
        }
      }
      for (let s = 0; s < setCount; s += 1) {
        const url = bySet.get(s);
        const cap = setImageCounts[s] ?? 0;
        for (let ii = 0; ii < cap; ii += 1) {
          await client.query(
            `INSERT INTO central_game_images (game_id, set_index, image_index, image_url)
             VALUES ($1, $2, $3, $4)`,
            [gameId, s, ii, url]
          );
        }
      }
    } else {
      for (const row of images) {
        const si = Math.floor(Number(row.setIndex));
        const ii = Math.floor(Number(row.imageIndex));
        const url = String(row.imageUrl || "").trim().slice(0, 2000);
        const cap = setImageCounts[si] ?? 0;
        if (si < 0 || si >= setCount || ii < 0 || ii >= cap) {
          const e = new Error(`ภาพชุด ${si + 1} ลำดับ ${ii} อยู่นอกขอบเขต (ชุดนี้มี ${cap} ภาพ)`);
          e.code = "VALIDATION";
          throw e;
        }
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          const e = new Error("ต้องเป็น URL รูป (http/https)");
          e.code = "VALIDATION";
          throw e;
        }
        await client.query(
          `INSERT INTO central_game_images (game_id, set_index, image_index, image_url)
           VALUES ($1, $2, $3, $4)`,
          [gameId, si, ii, url]
        );
      }
      const expected = setImageCounts.reduce((a, b) => a + b, 0);
      if (images.length !== expected) {
        const e = new Error(`ต้องอัปโหลดครบ ${expected} ภาพ (ผลรวมทุกชุด)`);
        e.code = "VALIDATION";
        throw e;
      }
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  await pool.query(`UPDATE central_games SET updated_at = NOW() WHERE id = $1`, [gameId]);
  return getGameSnapshotById(gameId);
}

const UUID_LOOSE_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeOptionalRuleId(raw, oldById) {
  const s = raw != null ? String(raw).trim().toLowerCase() : "";
  if (!s || !UUID_LOOSE_RE.test(s) || !oldById.has(s)) return null;
  return s;
}

const MSG_AWARDS_LOCK =
  "มีผู้ได้รับรางวัลจากเกมนี้แล้ว — แก้ได้เฉพาะชื่อเกม คำอธิบาย รูปปก / หลังป้าย และการแสดงในล็อบบี้ ไม่สามารถเปลี่ยนโครงป้าย รูป กติกา (ยกเว้นเพิ่มจำนวนรางวัล) หรือการหักหัวใจ";

function centralRuleStructureUnchanged(old, f) {
  return (
    old.setIndex === f.setIndex &&
    old.needCount === f.needCount &&
    String(old.prizeCategory || "").toLowerCase() === f.cat &&
    Math.floor(Number(old.sortOrder) || 0) === f.sortOrder &&
    String(old.prizeTitle || "") === f.prizeTitle &&
    String(old.prizeValueText || "") === f.prizeValueText &&
    String(old.prizeUnit || "") === f.prizeUnit &&
    String(old.description || "") === f.description
  );
}

async function replaceRules(gameId, rules, options = {}) {
  const pool = requirePool();
  const snap = await getGameSnapshotById(gameId);
  if (!snap) {
    const e = new Error("ไม่พบเกม");
    e.code = "NOT_FOUND";
    throw e;
  }
  const { setCount, setImageCounts } = snap.game;
  if (!Array.isArray(rules)) {
    const e = new Error("rules ต้องเป็นอาร์เรย์");
    e.code = "VALIDATION";
    throw e;
  }

  const allowUnsafeEdit = Boolean(options.allowUnsafeEdit);
  const awardCount = await getPrizeAwardCountForGame(gameId);
  if (awardCount > 0 && !allowUnsafeEdit && rules.length !== snap.rules.length) {
    const e = new Error(
      "มีผู้ได้รับรางวัลจากเกมนี้แล้ว — ห้ามเพิ่มหรือลบแถวกติกา (เพิ่มจำนวนรางวัลในแถวเดิมได้เท่านั้น)"
    );
    e.code = "VALIDATION";
    throw e;
  }

  const publishedLocked = Boolean(snap.game.isPublished || snap.game.isActive);
  const oldById = new Map(snap.rules.map((x) => [String(x.id).toLowerCase(), x]));

  let awardByRule = new Map();
  if ((publishedLocked || awardCount > 0) && oldById.size > 0) {
    const acRes = await pool.query(
      `SELECT rule_id::text AS rid, COUNT(*)::int AS c
       FROM central_prize_awards
       WHERE game_id = $1::uuid AND rule_id IS NOT NULL
       GROUP BY rule_id`,
      [gameId]
    );
    awardByRule = new Map(
      acRes.rows.map((row) => [String(row.rid).toLowerCase(), row.c])
    );
  }

  const prepared = [];
  for (let order = 0; order < rules.length; order += 1) {
    const r = rules[order];
    const setIndex = Math.floor(Number(r.setIndex));
    const needCount = Math.floor(Number(r.needCount));
    const cat = String(r.prizeCategory || "none").toLowerCase();
    if (!["cash", "item", "voucher", "none"].includes(cat)) {
      const e = new Error("ประเภทรางวัลไม่ถูกต้อง");
      e.code = "VALIDATION";
      throw e;
    }
    if (setIndex < 0 || setIndex >= setCount) {
      const e = new Error(`setIndex ${setIndex} อยู่นอกช่วง`);
      e.code = "VALIDATION";
      throw e;
    }
    const cap = setImageCounts[setIndex] ?? 0;
    if (needCount < 1 || needCount > cap) {
      const e = new Error(
        `ในชุด ${setIndex + 1} มี ${cap} ป้าย — ค่า "ต้องเปิดครบ" ต้องอยู่ระหว่าง 1 ถึง ${cap}`
      );
      e.code = "VALIDATION";
      throw e;
    }
    const prizeTotalQty =
      cat === "none"
        ? null
        : Math.max(1, Math.floor(Number(r.prizeTotalQty ?? r.prize_total_qty) || 1));

    const priorId = normalizeOptionalRuleId(r.id, oldById);
    const sortOrder = r.sortOrder != null ? Math.floor(Number(r.sortOrder)) : order;
    const prizeTitle = String(r.prizeTitle || "").slice(0, 200);
    const prizeValueText = String(r.prizeValueText || "").slice(0, 200);
    const prizeUnit = String(r.prizeUnit || "").slice(0, 32);
    const description = String(r.description || "").slice(0, 2000);

    if (awardCount > 0 && !allowUnsafeEdit) {
      if (!priorId) {
        const e = new Error(
          "มีผู้ได้รับรางวัลจากเกมนี้แล้ว — ต้องส่ง id กติกาเดิมทุกแถว (โหลดหน้าแก้ไขใหม่แล้วลองอีกครั้ง)"
        );
        e.code = "VALIDATION";
        throw e;
      }
      const oldR = oldById.get(priorId);
      if (
        !centralRuleStructureUnchanged(oldR, {
          setIndex,
          needCount,
          cat,
          sortOrder,
          prizeTitle,
          prizeValueText,
          prizeUnit,
          description
        })
      ) {
        const e = new Error(
          "มีผู้ได้รับรางวัลจากเกมนี้แล้ว — แก้ได้เฉพาะจำนวนรางวัล (เพิ่มได้เท่านั้น) ไม่สามารถเปลี่ยนเงื่อนไขอื่นของกติกา"
        );
        e.code = "VALIDATION";
        throw e;
      }
    }

    if (!allowUnsafeEdit && (publishedLocked || awardCount > 0) && cat !== "none" && priorId) {
      const old = oldById.get(priorId);
      const oldQty =
        old.prizeCategory === "none"
          ? 0
          : Math.max(1, Math.floor(Number(old.prizeTotalQty) || 1));
      const given = awardByRule.get(priorId) || 0;
      const floor = Math.max(oldQty, given);
      if (prizeTotalQty < floor) {
        const e = new Error(
          `จำนวนรางวัล (ชุด ${setIndex + 1}) ต้องไม่น้อยกว่า ${floor} — หลังเผยแพร่หรือมีผู้รับรางวัลแล้ว เพิ่มจำนวนได้อย่างเดียว (รวมจำนวนที่ออกรางวัลไปแล้ว)`
        );
        e.code = "VALIDATION";
        throw e;
      }
    }

    const rowId = priorId || crypto.randomUUID();
    prepared.push({
      id: rowId,
      sortOrder,
      setIndex,
      needCount,
      cat,
      prizeTitle,
      prizeValueText,
      prizeUnit,
      description,
      prizeTotalQty
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM central_game_rules WHERE game_id = $1`, [gameId]);
    for (const p of prepared) {
      await client.query(
        `INSERT INTO central_game_rules (
          id, game_id, sort_order, set_index, need_count, prize_category,
          prize_title, prize_value_text, prize_unit, description, prize_total_qty
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          p.id,
          gameId,
          p.sortOrder,
          p.setIndex,
          p.needCount,
          p.cat,
          p.prizeTitle,
          p.prizeValueText,
          p.prizeUnit,
          p.description,
          p.prizeTotalQty
        ]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  await pool.query(`UPDATE central_games SET updated_at = NOW() WHERE id = $1`, [gameId]);
  return getGameSnapshotById(gameId);
}

async function assertGamePlayable(snapshot) {
  if (!snapshot) {
    const e = new Error("ไม่พบเกม");
    e.code = "NOT_FOUND";
    throw e;
  }
  const { game, imageUrl, rules } = snapshot;
  const expected = game.tileCount;
  if (imageUrl.size !== expected) {
    const e = new Error(`ต้องอัปโหลดรูปครบ ${expected} ช่องก่อนเปิดใช้เกม`);
    e.code = "VALIDATION";
    throw e;
  }
  const winnable = rules.some((r) => r.prizeCategory !== "none");
  if (!winnable) {
    const e = new Error("ต้องมีอย่างน้อยหนึ่งกติกาที่มีรางวัล (ไม่ใช่แค่ \"ไม่มีรางวัล\")");
    e.code = "VALIDATION";
    throw e;
  }
  const { setCount, setImageCounts } = game;
  for (let s = 0; s < setCount; s += 1) {
    const n = setImageCounts[s] ?? 0;
    for (let i = 0; i < n; i += 1) {
      const u = imageUrl.get(`${s}-${i}`);
      if (!u || (!String(u).startsWith("http://") && !String(u).startsWith("https://"))) {
        const e = new Error(`ขาดรูปชุด ${s + 1} ภาพ ${i + 1} หรือ URL ไม่ถูกต้อง`);
        e.code = "VALIDATION";
        throw e;
      }
    }
  }
}

async function setActiveGame(gameId) {
  const pool = requirePool();
  const snap = await getGameSnapshotById(gameId);
  if (!snap) {
    const e = new Error("ไม่พบเกม");
    e.code = "NOT_FOUND";
    throw e;
  }
  await assertGamePlayable(snap);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`UPDATE central_games SET is_active = FALSE`);
    await assignGameCodeIfMissingTx(client, gameId);
    await client.query(
      `UPDATE central_games SET is_active = TRUE, is_published = TRUE, updated_at = NOW() WHERE id = $1`,
      [gameId]
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  return getGameSnapshotById(gameId);
}

async function deactivateAll() {
  const pool = requirePool();
  await pool.query(`UPDATE central_games SET is_active = FALSE`);
}

async function deactivateGame(gameId) {
  const pool = requirePool();
  await pool.query(
    `UPDATE central_games SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
    [gameId]
  );
}

async function deleteGame(gameId) {
  const pool = requirePool();
  await pool.query(`DELETE FROM central_games WHERE id = $1`, [gameId]);
}

function prizesForClient(rules, setImageCounts, givenByRuleId = null) {
  const catLabel = {
    cash: "เงินสด",
    item: "สิ่งของ",
    voucher: "บัตรกำนัล",
    none: "ไม่มีรางวัล"
  };
  const map =
    givenByRuleId && typeof givenByRuleId === "object" ? givenByRuleId : null;
  return rules.map((r) => {
    const cap = setImageCounts[r.setIndex] ?? setImageCounts[0] ?? 1;
    const rid = String(r.id);
    const given =
      map && map[rid] != null ? Math.max(0, Math.floor(Number(map[rid]) || 0)) : 0;
    return {
      key: r.id,
      ruleId: r.id,
      setIndex: Math.max(0, Math.floor(Number(r.setIndex)) || 0),
      need: r.needCount,
      imagesPerSet: cap,
      label: formatRuleLabel(r, catLabel, cap),
      prizeCategory: r.prizeCategory,
      prizeTitle: r.prizeTitle,
      prizeValueText: r.prizeValueText || "",
      prizeUnit: r.prizeUnit || "",
      totalPrizeQty:
        r.prizeCategory === "none" ? null : (r.prizeTotalQty ?? 1),
      prizesGivenSoFar: map ? given : 0
    };
  });
}

function formatRuleLabel(r, catLabel, imagesInThisSet) {
  const cat = catLabel[r.prizeCategory] || r.prizeCategory;
  if (r.prizeCategory === "none") {
    return `ชุด ${r.setIndex + 1}: เปิดครบ ${r.needCount}/${imagesInThisSet} ป้ายในชุด = จบรอบ (ไม่มีรางวัล · หัวใจไม่คืน)`;
  }
  const val = [r.prizeValueText, r.prizeUnit].filter(Boolean).join(" ");
  const head = r.prizeTitle || cat;
  const qty = Math.max(1, Math.floor(Number(r.prizeTotalQty) || 1));
  const qtyPart = ` · จัดรางวัลรวม ${qty} ชิ้น/ที่`;
  return `ชุด ${r.setIndex + 1}: เปิดในชุดครบ ${r.needCount}/${imagesInThisSet} ป้าย → ${head}${val ? ` (${val})` : ""}${qtyPart}`;
}

function formatWinnerDisplay(r) {
  if (!r || r.prizeCategory === "none") return null;
  const cat = { cash: "เงินสด", item: "สิ่งของ", voucher: "บัตรกำนัล" }[r.prizeCategory];
  const head = r.prizeTitle || cat || "รางวัล";
  const tail = [r.prizeValueText, r.prizeUnit].filter(Boolean).join(" ");
  return tail ? `${head}: ${tail}` : head;
}

/** ข้อความเมื่อครบกติกา none — จบรอบแพ้ */
function formatLossRuleDisplay(r, imagesInThisSet) {
  if (!r || r.prizeCategory !== "none") return "จบรอบ — ไม่มีรางวัล";
  const cap = imagesInThisSet ?? 1;
  const extra = String(r.description || "").trim();
  const base = `ชุด ${r.setIndex + 1}: ครบเงื่อนไข ${r.needCount}/${cap} ป้าย — รอบจบ (ไม่มีรางวัล · หัวใจไม่คืน)`;
  return extra ? `${base} — ${extra}` : base;
}

/** URL รูปตัวแทนแต่ละชุด (ภาพแรกในชุด) — ใช้แสดงกติกาแบบไอคอน */
function setPreviewUrlsFromSnapshot(snap) {
  if (!snap || !snap.game) return [];
  const { game, imageUrl } = snap;
  const sc = Math.max(0, Math.floor(Number(game.setCount) || 0));
  if (!sc) return [];
  if (!imageUrl || typeof imageUrl.get !== "function") {
    return Array.from({ length: sc }, () => null);
  }
  const out = [];
  for (let s = 0; s < sc; s += 1) {
    const cap = Math.max(1, Math.floor(Number(game.setImageCounts[s]) || 0));
    let found = null;
    for (let i = 0; i < cap; i += 1) {
      const raw = imageUrl.get(`${s}-${i}`);
      if (raw != null && String(raw).trim()) {
        found = String(raw).trim();
        break;
      }
    }
    out.push(found);
  }
  return out;
}

module.exports = {
  getActiveGameSnapshot,
  getGameSnapshotById,
  getPublishedGameSnapshotById,
  listPublishedGamesForPublic,
  listGamesForAdmin,
  getPrizeAwardCountForGame,
  getPrizeAwardCountByRule,
  createGame,
  updateGameMeta,
  replaceImages,
  replaceRules,
  setActiveGame,
  deactivateAll,
  deactivateGame,
  deleteGame,
  assertGamePlayable,
  prizesForClient,
  formatRuleLabel,
  formatWinnerDisplay,
  formatLossRuleDisplay,
  setPreviewUrlsFromSnapshot,
  ensurePublishedGameCode
};
