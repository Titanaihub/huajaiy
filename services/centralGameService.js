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

function rowGame(row) {
  const legacyHeart = Math.max(0, Math.floor(Number(row.heart_cost) || 0));
  let pinkHeartCost = Math.max(0, Math.floor(Number(row.pink_heart_cost) || 0));
  let redHeartCost = Math.max(0, Math.floor(Number(row.red_heart_cost) || 0));
  if (pinkHeartCost === 0 && redHeartCost === 0 && legacyHeart > 0) {
    pinkHeartCost = legacyHeart;
  }
  return {
    id: row.id,
    title: row.title,
    tileCount: row.tile_count,
    setCount: row.set_count,
    imagesPerSet: row.images_per_set,
    pinkHeartCost,
    redHeartCost,
    heartCost: pinkHeartCost + redHeartCost,
    isActive: Boolean(row.is_active),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
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
    description: row.description || ""
  };
}

/** snapshot สำหรับสร้าง session — รวม lookup รูป */
async function getGameSnapshotById(gameId) {
  const pool = requirePool();
  const g = await pool.query(`SELECT * FROM central_games WHERE id = $1`, [gameId]);
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

async function listGamesForAdmin() {
  const pool = requirePool();
  const r = await pool.query(
    `SELECT * FROM central_games ORDER BY updated_at DESC NULLS LAST, created_at DESC`
  );
  return r.rows.map(rowGame);
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

async function createGame({
  title,
  tileCount,
  setCount,
  imagesPerSet,
  heartCost = 0,
  pinkHeartCost,
  redHeartCost,
  createdBy = null
}) {
  const pool = requirePool();
  const t = String(title || "").trim().slice(0, 200);
  const tc = Math.floor(Number(tileCount) || 0);
  const sc = Math.floor(Number(setCount) || 0);
  const m = Math.floor(Number(imagesPerSet) || 0);
  if (!t) {
    const e = new Error("ต้องมีชื่อเกม");
    e.code = "VALIDATION";
    throw e;
  }
  if (sc < 1 || m < 1 || tc < 1) {
    const e = new Error("จำนวนชุด ภาพต่อชุด และป้ายต้องมากกว่า 0");
    e.code = "VALIDATION";
    throw e;
  }
  if (tc !== sc * m) {
    const e = new Error(
      `จำนวนป้าย (${tc}) ต้องเท่ากับ ชุด×ภาพต่อชุด = ${sc}×${m} = ${sc * m}`
    );
    e.code = "VALIDATION";
    throw e;
  }
  const id = crypto.randomUUID();
  const { pink, red } = normalizePinkRedCosts(
    { heartCost, pinkHeartCost, redHeartCost },
    0,
    0
  );
  const heartSum = pink + red;
  await pool.query(
    `INSERT INTO central_games (id, title, tile_count, set_count, images_per_set, heart_cost, pink_heart_cost, red_heart_cost, is_active, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9)`,
    [id, t, tc, sc, m, heartSum, pink, red, createdBy]
  );
  return getGameSnapshotById(id);
}

async function updateGameMeta(gameId, patch) {
  const pool = requirePool();
  const cur = await pool.query(`SELECT * FROM central_games WHERE id = $1`, [gameId]);
  if (cur.rows.length === 0) return null;
  const c = rowGame(cur.rows[0]);
  const title = patch.title != null ? String(patch.title).trim().slice(0, 200) : c.title;
  const tc =
    patch.tileCount != null ? Math.floor(Number(patch.tileCount) || 0) : c.tileCount;
  const sc = patch.setCount != null ? Math.floor(Number(patch.setCount) || 0) : c.setCount;
  const m =
    patch.imagesPerSet != null
      ? Math.floor(Number(patch.imagesPerSet) || 0)
      : c.imagesPerSet;
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
  const heartSum = pink + red;
  if (!title) {
    const e = new Error("ต้องมีชื่อเกม");
    e.code = "VALIDATION";
    throw e;
  }
  if (tc !== sc * m) {
    const e = new Error(`จำนวนป้าย (${tc}) ต้องเท่ากับ ${sc}×${m} = ${sc * m}`);
    e.code = "VALIDATION";
    throw e;
  }
  await pool.query(
    `UPDATE central_games SET title = $2, tile_count = $3, set_count = $4, images_per_set = $5, heart_cost = $6, pink_heart_cost = $7, red_heart_cost = $8, updated_at = NOW() WHERE id = $1`,
    [gameId, title, tc, sc, m, heartSum, pink, red]
  );
  return getGameSnapshotById(gameId);
}

async function replaceImages(gameId, images) {
  const pool = requirePool();
  const snap = await getGameSnapshotById(gameId);
  if (!snap) {
    const e = new Error("ไม่พบเกม");
    e.code = "NOT_FOUND";
    throw e;
  }
  const { setCount, imagesPerSet } = snap.game;
  if (!Array.isArray(images)) {
    const e = new Error("images ต้องเป็นอาร์เรย์");
    e.code = "VALIDATION";
    throw e;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM central_game_images WHERE game_id = $1`, [gameId]);
    for (const row of images) {
      const si = Math.floor(Number(row.setIndex));
      const ii = Math.floor(Number(row.imageIndex));
      const url = String(row.imageUrl || "").trim().slice(0, 2000);
      if (si < 0 || si >= setCount || ii < 0 || ii >= imagesPerSet) {
        const e = new Error(`ภาพชุด ${si} ลำดับ ${ii} อยู่นอกขอบเขต`);
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
    const expected = setCount * imagesPerSet;
    if (images.length !== expected) {
      const e = new Error(`ต้องอัปโหลดครบ ${expected} ภาพ (ชุด×ภาพต่อชุด)`);
      e.code = "VALIDATION";
      throw e;
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

async function replaceRules(gameId, rules) {
  const pool = requirePool();
  const snap = await getGameSnapshotById(gameId);
  if (!snap) {
    const e = new Error("ไม่พบเกม");
    e.code = "NOT_FOUND";
    throw e;
  }
  const { setCount, imagesPerSet } = snap.game;
  if (!Array.isArray(rules)) {
    const e = new Error("rules ต้องเป็นอาร์เรย์");
    e.code = "VALIDATION";
    throw e;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM central_game_rules WHERE game_id = $1`, [gameId]);
    let order = 0;
    for (const r of rules) {
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
      if (needCount < 1 || needCount > imagesPerSet) {
        const e = new Error(`needCount ต้องอยู่ระหว่าง 1 ถึง ${imagesPerSet}`);
        e.code = "VALIDATION";
        throw e;
      }
      const id = crypto.randomUUID();
      await client.query(
        `INSERT INTO central_game_rules (
          id, game_id, sort_order, set_index, need_count, prize_category,
          prize_title, prize_value_text, prize_unit, description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          id,
          gameId,
          r.sortOrder != null ? Math.floor(Number(r.sortOrder)) : order,
          setIndex,
          needCount,
          cat,
          String(r.prizeTitle || "").slice(0, 200),
          String(r.prizeValueText || "").slice(0, 200),
          String(r.prizeUnit || "").slice(0, 32),
          String(r.description || "").slice(0, 2000)
        ]
      );
      order += 1;
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
  const expected = game.setCount * game.imagesPerSet;
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
    await client.query(`UPDATE central_games SET is_active = TRUE, updated_at = NOW() WHERE id = $1`, [
      gameId
    ]);
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

function prizesForClient(rules, imagesPerSet) {
  const catLabel = {
    cash: "เงินสด",
    item: "สิ่งของ",
    voucher: "บัตรกำนัล",
    none: "ไม่มีรางวัล"
  };
  return rules.map((r) => ({
    key: r.id,
    ruleId: r.id,
    setIndex: r.setIndex,
    need: r.needCount,
    imagesPerSet,
    label: formatRuleLabel(r, catLabel, imagesPerSet),
    prizeCategory: r.prizeCategory,
    prizeTitle: r.prizeTitle
  }));
}

function formatRuleLabel(r, catLabel, imagesPerSet) {
  const cat = catLabel[r.prizeCategory] || r.prizeCategory;
  if (r.prizeCategory === "none") {
    return `ชุด ${r.setIndex + 1}: ไม่แจกรางวัล (เงื่อนไขในชุด ${r.needCount}/${imagesPerSet} ป้าย — ไม่จบเกม)`;
  }
  const val = [r.prizeValueText, r.prizeUnit].filter(Boolean).join(" ");
  const head = r.prizeTitle || cat;
  return `ชุด ${r.setIndex + 1}: เปิดในชุดครบ ${r.needCount}/${imagesPerSet} ป้าย → ${head}${val ? ` (${val})` : ""}`;
}

function formatWinnerDisplay(r) {
  if (!r || r.prizeCategory === "none") return null;
  const cat = { cash: "เงินสด", item: "สิ่งของ", voucher: "บัตรกำนัล" }[r.prizeCategory];
  const head = r.prizeTitle || cat || "รางวัล";
  const tail = [r.prizeValueText, r.prizeUnit].filter(Boolean).join(" ");
  return tail ? `${head}: ${tail}` : head;
}

module.exports = {
  getActiveGameSnapshot,
  getGameSnapshotById,
  listGamesForAdmin,
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
  formatWinnerDisplay
};
