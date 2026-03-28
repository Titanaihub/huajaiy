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

/** URL ภาพหน้าป้าย (ว่าง = ไม่ตั้ง) — ต้อง http(s) */
function normalizeTileBackCoverUrl(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().slice(0, 2000);
  if (!s) return null;
  if (!s.startsWith("http://") && !s.startsWith("https://")) {
    const e = new Error("ภาพหน้าป้ายต้องเป็น URL (http/https)");
    e.code = "VALIDATION";
    throw e;
  }
  return s;
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
        : null
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
    prizeTotalQty: Math.max(
      1,
      Math.floor(Number(row.prize_total_qty)) || 1
    )
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
  setImageCounts: setImageCountsBody,
  heartCost = 0,
  pinkHeartCost,
  redHeartCost,
  tileBackCoverUrl,
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
  const { pink, red } = normalizePinkRedCosts(
    { heartCost, pinkHeartCost, redHeartCost },
    0,
    0
  );
  const heartSum = pink + red;
  await pool.query(
    `INSERT INTO central_games (id, title, tile_count, set_count, images_per_set, set_image_counts, heart_cost, pink_heart_cost, red_heart_cost, is_active, created_by)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, FALSE, $10)`,
    [id, t, tc, sc, maxPer, JSON.stringify(sizes), heartSum, pink, red, createdBy]
  );
  return getGameSnapshotById(id);
}

async function updateGameMeta(gameId, patch) {
  const pool = requirePool();
  const cur = await pool.query(`SELECT * FROM central_games WHERE id = $1`, [gameId]);
  if (cur.rows.length === 0) return null;
  const c = rowGame(cur.rows[0]);
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
  const heartSum = pink + red;
  if (!title) {
    const e = new Error("ต้องมีชื่อเกม");
    e.code = "VALIDATION";
    throw e;
  }
  let coverSql = "";
  const params = [gameId, title, tc, sc, maxPer, JSON.stringify(sizes), heartSum, pink, red];
  if (patch.tileBackCoverUrl !== undefined) {
    const v =
      patch.tileBackCoverUrl === null || patch.tileBackCoverUrl === ""
        ? null
        : normalizeTileBackCoverUrl(patch.tileBackCoverUrl);
    params.push(v);
    coverSql = `, tile_back_cover_url = $${params.length}`;
  }
  await pool.query(
    `UPDATE central_games SET title = $2, tile_count = $3, set_count = $4, images_per_set = $5, set_image_counts = $6::jsonb, heart_cost = $7, pink_heart_cost = $8, red_heart_cost = $9, updated_at = NOW()${coverSql} WHERE id = $1`,
    params
  );
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

async function replaceRules(gameId, rules) {
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
      const cap = setImageCounts[setIndex] ?? 0;
      if (needCount < 1 || needCount > cap) {
        const e = new Error(
          `ในชุด ${setIndex + 1} มี ${cap} ป้าย — ค่า "ต้องเปิดครบ" ต้องอยู่ระหว่าง 1 ถึง ${cap}`
        );
        e.code = "VALIDATION";
        throw e;
      }
      const id = crypto.randomUUID();
      const prizeTotalQty = Math.max(
        1,
        Math.floor(Number(r.prizeTotalQty ?? r.prize_total_qty) || 1)
      );
      await client.query(
        `INSERT INTO central_game_rules (
          id, game_id, sort_order, set_index, need_count, prize_category,
          prize_title, prize_value_text, prize_unit, description, prize_total_qty
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
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
          String(r.description || "").slice(0, 2000),
          prizeTotalQty
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

function prizesForClient(rules, setImageCounts) {
  const catLabel = {
    cash: "เงินสด",
    item: "สิ่งของ",
    voucher: "บัตรกำนัล",
    none: "ไม่มีรางวัล"
  };
  return rules.map((r) => {
    const cap = setImageCounts[r.setIndex] ?? setImageCounts[0] ?? 1;
    return {
      key: r.id,
      ruleId: r.id,
      setIndex: r.setIndex,
      need: r.needCount,
      imagesPerSet: cap,
      label: formatRuleLabel(r, catLabel, cap),
      prizeCategory: r.prizeCategory,
      prizeTitle: r.prizeTitle,
      totalPrizeQty: r.prizeTotalQty ?? 1
    };
  });
}

function formatRuleLabel(r, catLabel, imagesInThisSet) {
  const cat = catLabel[r.prizeCategory] || r.prizeCategory;
  if (r.prizeCategory === "none") {
    return `ชุด ${r.setIndex + 1}: ไม่แจกรางวัล (เงื่อนไข ${r.needCount}/${imagesInThisSet} ป้ายในชุด — ไม่จบเกม)`;
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
