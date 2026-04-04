const crypto = require("crypto");
const { getPool } = require("../db/pool");
const heartLedgerService = require("./heartLedgerService");

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeGiftCode() {
  let s = "R";
  for (let i = 0; i < 8; i += 1) {
    s += CODE_CHARS[crypto.randomInt(0, CODE_CHARS.length)];
  }
  return s;
}

function parseExpiresInput(v) {
  if (v == null || !String(v).trim()) return null;
  const d = new Date(String(v).trim());
  if (Number.isNaN(d.getTime())) {
    const e = new Error("รูปแบบวันหมดอายุไม่ถูกต้อง");
    e.code = "VALIDATION";
    throw e;
  }
  return d.toISOString();
}

/**
 * @param {import("pg").PoolClient} client
 */
async function insertOneCode(
  client,
  creatorId,
  redAmount,
  maxUses,
  expiresAtIso,
  fundedGiveaway,
  fundedPlayable
) {
  const fg = Math.max(0, Math.floor(Number(fundedGiveaway) || 0));
  const fp = Math.max(0, Math.floor(Number(fundedPlayable) || 0));
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const code = makeGiftCode();
    const id = crypto.randomUUID();
    try {
      const r = await client.query(
        `INSERT INTO room_red_gift_codes (
           id, code, creator_id, red_amount, max_uses, uses_count, expires_at,
           funded_giveaway, funded_playable
         )
         VALUES ($1, $2, $3::uuid, $4, $5, 0, $6, $7, $8)
         RETURNING id, code, creator_id AS "creatorId", red_amount AS "redAmount",
           max_uses AS "maxUses", uses_count AS "usesCount", expires_at AS "expiresAt", created_at AS "createdAt"`,
        [id, code, creatorId, redAmount, maxUses, expiresAtIso, fg, fp]
      );
      return r.rows[0];
    } catch (e) {
      if (e.code === "23505") continue;
      throw e;
    }
  }
  const e = new Error("สร้างรหัสไม่สำเร็จ — ลองใหม่");
  e.code = "VALIDATION";
  throw e;
}

/**
 * สร้างรหัสและหักหัวใจแดงจากเจ้าของทันที
 * ต้นทุนรวม = redAmount × maxUsesPerCode × จำนวนรหัส
 */
async function issueRoomRedGiftCodes(creatorId, options = {}) {
  const pool = getPool();
  if (!pool) {
    const e = new Error("ระบบรหัสห้องต้องใช้ PostgreSQL");
    e.code = "DB_REQUIRED";
    throw e;
  }
  const redAmount = Math.max(1, Math.floor(Number(options.redAmount) || 0));
  const codeCount = Math.min(100, Math.max(1, Math.floor(Number(options.codeCount) || 1)));
  let maxUses = Math.max(1, Math.floor(Number(options.maxUses) || 1));
  if (codeCount > 1) {
    maxUses = 1;
  }
  const expiresAtIso =
    options.expiresAt != null && String(options.expiresAt).trim()
      ? parseExpiresInput(options.expiresAt)
      : null;

  const totalRedCost = redAmount * maxUses * codeCount;

  const client = await pool.connect();
  const codes = [];
  try {
    await client.query("BEGIN");

    const uRes = await client.query(
      `SELECT pink_hearts_balance, red_hearts_balance, COALESCE(red_giveaway_balance, 0) AS red_giveaway_balance
       FROM users WHERE id = $1::uuid FOR UPDATE`,
      [creatorId]
    );
    if (uRes.rows.length === 0) {
      await client.query("ROLLBACK");
      const e = new Error("ไม่พบบัญชี");
      e.code = "NOT_FOUND";
      throw e;
    }
    const curPink = Math.max(
      0,
      Math.floor(Number(uRes.rows[0].pink_hearts_balance) || 0)
    );
    const curRed = Math.max(
      0,
      Math.floor(Number(uRes.rows[0].red_hearts_balance) || 0)
    );
    const curGive = Math.max(
      0,
      Math.floor(Number(uRes.rows[0].red_giveaway_balance) || 0)
    );

    let remGive = curGive;
    let remPlay = curRed;
    const perCodeCost = redAmount * maxUses;

    for (let i = 0; i < codeCount; i += 1) {
      const fromG = Math.min(remGive, perCodeCost);
      const needP = perCodeCost - fromG;
      if (needP > remPlay) {
        await client.query("ROLLBACK");
        const e = new Error("หัวใจแดงไม่พอสร้างรหัส");
        e.code = "INSUFFICIENT_REDS";
        throw e;
      }
      remGive -= fromG;
      remPlay -= needP;
      codes.push(
        await insertOneCode(
          client,
          creatorId,
          redAmount,
          maxUses,
          expiresAtIso,
          fromG,
          needP
        )
      );
    }

    const fromGiveawayTotal = curGive - remGive;
    const fromPlayableTotal = curRed - remPlay;
    const newGive = remGive;
    const newRed = remPlay;
    await client.query(
      `UPDATE users SET
        red_giveaway_balance = $2,
        red_hearts_balance = $3,
        hearts_balance = $4::integer + $3::integer + $2::integer
      WHERE id = $1::uuid`,
      [creatorId, newGive, newRed, curPink]
    );

    await heartLedgerService.insertWithClient(client, {
      userId: creatorId,
      pinkDelta: 0,
      redDelta: -fromPlayableTotal,
      pinkAfter: curPink,
      redAfter: newRed,
      kind: "room_red_code_issue",
      label: `สร้างรหัสแจกแดงห้อง · ${codeCount} รหัส · หักรวม ${totalRedCost} (แจก ${fromGiveawayTotal} · เล่นได้ ${fromPlayableTotal})`,
      meta: {
        codeCount,
        redPerRedemption: redAmount,
        maxUsesPerCode: maxUses,
        codeIds: codes.map((c) => c.id),
        giveawayDeducted: fromGiveawayTotal,
        playableRedDeducted: fromPlayableTotal,
        redGiveawayBalanceAfter: newGive
      }
    });

    await client.query("COMMIT");
    return { codes, code: codes[0] || null, redDeducted: totalRedCost };
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

/**
 * เจ้าของลบรหัส — คืนแดงส่วนที่ยังไม่ถูกแลก (เหลือกี่ครั้ง × แดงต่อครั้ง)
 */
async function deleteCodeByCreator(creatorId, codeId) {
  const pool = getPool();
  if (!pool) {
    const e = new Error("DB_REQUIRED");
    e.code = "DB_REQUIRED";
    throw e;
  }
  const id = String(codeId || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    const e = new Error("รูปแบบรหัสอ้างอิงไม่ถูกต้อง");
    e.code = "VALIDATION";
    throw e;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cRes = await client.query(
      `SELECT * FROM room_red_gift_codes WHERE id = $1::uuid FOR UPDATE`,
      [id]
    );
    if (cRes.rows.length === 0) {
      await client.query("ROLLBACK");
      const e = new Error("ไม่พบรหัสนี้");
      e.code = "NOT_FOUND";
      throw e;
    }
    const c = cRes.rows[0];
    if (String(c.creator_id) !== String(creatorId)) {
      await client.query("ROLLBACK");
      const e = new Error("ไม่ใช่รหัสของคุณ");
      e.code = "FORBIDDEN";
      throw e;
    }

    if (c.canceled_at) {
      await client.query("ROLLBACK");
      return { ok: true, refund: 0, deletedCode: c.code };
    }
    const redAmt = Math.max(1, Math.floor(Number(c.red_amount) || 0));
    const maxU = Math.max(1, Math.floor(Number(c.max_uses) || 1));
    const used = Math.max(0, Math.floor(Number(c.uses_count) || 0));
    const remainingUses = Math.max(0, maxU - used);
    const refund = remainingUses * redAmt;
    const fundedG = Math.max(
      0,
      Math.floor(Number(c.funded_giveaway) || 0)
    );
    const fundedP = Math.max(
      0,
      Math.floor(Number(c.funded_playable) || 0)
    );
    const sumFunded = fundedG + fundedP;
    let refundG = 0;
    let refundP = refund;
    if (refund > 0 && sumFunded > 0) {
      refundG = Math.floor((refund * fundedG) / sumFunded);
      refundP = refund - refundG;
    }

    await client.query(
      `UPDATE room_red_gift_codes
       SET canceled_at = NOW(), uses_count = max_uses, expires_at = COALESCE(expires_at, NOW())
       WHERE id = $1::uuid`,
      [id]
    );

    if (refund > 0) {
      const uRes = await client.query(
        `SELECT pink_hearts_balance, red_hearts_balance, COALESCE(red_giveaway_balance, 0) AS red_giveaway_balance
         FROM users WHERE id = $1::uuid FOR UPDATE`,
        [creatorId]
      );
      const curPink = Math.max(
        0,
        Math.floor(Number(uRes.rows[0].pink_hearts_balance) || 0)
      );
      const curRed = Math.max(
        0,
        Math.floor(Number(uRes.rows[0].red_hearts_balance) || 0)
      );
      const curGive = Math.max(
        0,
        Math.floor(Number(uRes.rows[0].red_giveaway_balance) || 0)
      );
      const newRed = curRed + refundP;
      const newGive = curGive + refundG;
      await client.query(
        `UPDATE users SET
          red_hearts_balance = $2,
          red_giveaway_balance = $3,
          hearts_balance = $4::integer + $2::integer + $3::integer
        WHERE id = $1::uuid`,
        [creatorId, newRed, newGive, curPink]
      );
      await heartLedgerService.insertWithClient(client, {
        userId: creatorId,
        pinkDelta: 0,
        redDelta: refundP,
        pinkAfter: curPink,
        redAfter: newRed,
        kind: "room_red_code_refund",
        label: `ลบรหัสแจกแดงห้อง · คืน ${refund} ดวง (แจก ${refundG} · เล่นได้ ${refundP})`,
        meta: {
          deletedCodeId: id,
          code: c.code,
          remainingUses,
          giveawayRefunded: refundG,
          playableRefunded: refundP,
          redGiveawayBalanceAfter: newGive
        }
      });
    }

    await client.query("COMMIT");
    return { ok: true, refund, deletedCode: c.code };
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

const BATCH_DETAIL_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * รายละเอียดรหัสแจกหลายรหัสพร้อมผู้แลก — ใช้เฉพาะเจ้าของรหัส (ตรวจครบทุก id)
 * @param {string} creatorId
 * @param {string[]} rawIds
 */
async function getCodesBatchDetailForCreator(creatorId, rawIds) {
  const pool = getPool();
  if (!pool) {
    const e = new Error("DB_REQUIRED");
    e.code = "DB_REQUIRED";
    throw e;
  }
  const seen = new Set();
  const ids = [];
  for (const x of Array.isArray(rawIds) ? rawIds : []) {
    const id = String(x || "").trim();
    if (!BATCH_DETAIL_UUID_RE.test(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= 50) break;
  }
  if (ids.length === 0) {
    const e = new Error("ไม่มีรหัสอ้างอิงที่ถูกต้อง");
    e.code = "VALIDATION";
    throw e;
  }

  const cRes = await pool.query(
    `SELECT id, code, red_amount AS "redAmount", max_uses AS "maxUses", uses_count AS "usesCount"
     FROM room_red_gift_codes
     WHERE creator_id = $1::uuid AND id = ANY($2::uuid[])`,
    [creatorId, ids]
  );
  if (cRes.rows.length !== ids.length) {
    const e = new Error("ไม่พบรหัสหรือไม่ใช่รหัสของคุณ");
    e.code = "FORBIDDEN";
    throw e;
  }

  const byId = new Map(
    cRes.rows.map((r) => [String(r.id), r])
  );
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

  const rr = await pool.query(
    `SELECT rr.code_id AS "codeId", rr.redeemed_at AS "redeemedAt",
            u.username AS "redeemerUsername", rr.red_amount AS "redAmount"
     FROM room_red_gift_redemptions rr
     LEFT JOIN users u ON u.id = rr.redeemer_id
     WHERE rr.creator_id = $1::uuid AND rr.code_id = ANY($2::uuid[])
     ORDER BY rr.redeemed_at ASC`,
    [creatorId, ids]
  );
  const redemptionsByCode = new Map();
  for (const row of rr.rows) {
    const k = String(row.codeId);
    if (!redemptionsByCode.has(k)) redemptionsByCode.set(k, []);
    redemptionsByCode.get(k).push({
      redeemedAt: row.redeemedAt,
      redeemerUsername: row.redeemerUsername
        ? String(row.redeemerUsername).toLowerCase()
        : null,
      redAmount: Math.max(0, Math.floor(Number(row.redAmount) || 0))
    });
  }

  return ordered.map((c) => ({
    id: String(c.id),
    code: c.code != null ? String(c.code).trim().toUpperCase() : "",
    redAmount: Math.max(0, Math.floor(Number(c.redAmount) || 0)),
    maxUses: Math.max(1, Math.floor(Number(c.maxUses) || 1)),
    usesCount: Math.max(0, Math.floor(Number(c.usesCount) || 0)),
    redemptions: redemptionsByCode.get(String(c.id)) || []
  }));
}

async function listCodesForCreator(creatorId) {
  const pool = getPool();
  if (!pool) {
    const e = new Error("DB_REQUIRED");
    e.code = "DB_REQUIRED";
    throw e;
  }
  const r = await pool.query(
    `SELECT id, code, creator_id AS "creatorId", red_amount AS "redAmount",
            max_uses AS "maxUses", uses_count AS "usesCount",
            expires_at AS "expiresAt", created_at AS "createdAt",
            canceled_at AS "canceledAt"
     FROM room_red_gift_codes
     WHERE creator_id = $1::uuid
     ORDER BY created_at DESC
     LIMIT 100`,
    [creatorId]
  );
  const redemptions = await pool.query(
    `SELECT rr.code_id AS "codeId", rr.redeemed_at AS "redeemedAt",
            u.username AS "redeemerUsername"
     FROM room_red_gift_redemptions rr
     LEFT JOIN users u ON u.id = rr.redeemer_id
     WHERE rr.creator_id = $1::uuid
     ORDER BY rr.redeemed_at DESC
     LIMIT 500`,
    [creatorId]
  );
  const byCode = new Map();
  for (const row of redemptions.rows) {
    const key = String(row.codeId);
    if (!byCode.has(key)) byCode.set(key, []);
    byCode.get(key).push({
      redeemedAt: row.redeemedAt,
      redeemerUsername: row.redeemerUsername
        ? String(row.redeemerUsername).toLowerCase()
        : null
    });
  }

  return r.rows.map((row) => {
    const history = byCode.get(String(row.id)) || [];
    const uniqueUsers = [...new Set(history.map((h) => h.redeemerUsername).filter(Boolean))];
    return ({
    ...row,
    redemptions: history,
    redeemedByUsernames: uniqueUsers,
    cancelled: Boolean(row.canceledAt),
    expired:
      row.expiresAt != null && new Date(row.expiresAt).getTime() < Date.now(),
    exhausted: Number(row.usesCount) >= Number(row.maxUses)
  })});
}

/**
 * ยอดหัวใจแดงจากรหัสห้องต่อเจ้าของห้อง (สำหรับแสดงใน /me)
 */
async function listRoomGiftBalancesForUser(userId) {
  const pool = getPool();
  if (!pool) return [];
  const r = await pool.query(
    `SELECT b.creator_id AS "creatorId", b.balance,
            u.username AS "creatorUsername"
     FROM user_room_red_balance b
     LEFT JOIN users u ON u.id = b.creator_id
     WHERE b.user_id = $1::uuid AND b.balance > 0
     ORDER BY b.updated_at DESC`,
    [userId]
  );
  return r.rows.map((row) => ({
    creatorId: String(row.creatorId),
    balance: Math.max(0, Math.floor(Number(row.balance) || 0)),
    creatorUsername: row.creatorUsername
      ? String(row.creatorUsername).toLowerCase()
      : null
  }));
}

/** meta จาก heart_ledger (jsonb / string) */
function normalizeLedgerMeta(raw) {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return null;
    try {
      const o = JSON.parse(s);
      return o && typeof o === "object" && !Array.isArray(o) ? o : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  return null;
}

function prizeStatusSuffixFromMeta(m) {
  if (!m) return "";
  const oRaw =
    m.roundOutcome != null
      ? String(m.roundOutcome).trim().toLowerCase()
      : m.round_outcome != null
        ? String(m.round_outcome).trim().toLowerCase()
        : "";
  const sum =
    m.roundPrizeSummary != null
      ? String(m.roundPrizeSummary).trim()
      : m.round_prize_summary != null
        ? String(m.round_prize_summary).trim()
        : "";
  if (oRaw === "won") {
    if (sum) return ` (ได้รับรางวัล — ${sum})`;
    return " (ได้รับรางวัล)";
  }
  if (oRaw === "lost") {
    if (sum && sum !== "ไม่ได้รับรางวัล") {
      return ` (ไม่ได้รับรางวัล · ${sum})`;
    }
    return " (ไม่ได้รับรางวัล)";
  }
  return "";
}

function gameItemLineFromLedgerRow(label, meta) {
  const base =
    label != null && String(label).trim()
      ? String(label).trim()
      : "เริ่มเล่นเกม";
  return base + prizeStatusSuffixFromMeta(meta);
}

const ROOM_TIMELINE_MAX_RED = 8000;
const ROOM_TIMELINE_MAX_GAME = 8000;

/**
 * ประวัติแดงห้องต่อเจ้าของห้อง — รวมแลกรหัส + หักเกม จาก DB แล้วคำนวณคงเหลือตามเวลาจริง
 * ให้ตรงกับ user_room_red_balance เมื่อโหลดครบ (ไม่ถูกตัด limit)
 */
async function listRoomRedRoomTimelineForRedeemer(userId) {
  const pool = getPool();
  if (!pool) {
    const e = new Error("DB_REQUIRED");
    e.code = "DB_REQUIRED";
    throw e;
  }

  const [balRes, redCountRes, redRes, gameCountRes, ledRes] = await Promise.all([
    pool.query(
      `SELECT b.creator_id::text AS "creatorId", b.balance,
              u.username AS "creatorUsername"
       FROM user_room_red_balance b
       LEFT JOIN users u ON u.id = b.creator_id
       WHERE b.user_id = $1::uuid`,
      [userId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS c FROM room_red_gift_redemptions WHERE redeemer_id = $1::uuid`,
      [userId]
    ),
    pool.query(
      `SELECT rr.id::text AS id, rr.redeemed_at AS "redeemedAt", rr.red_amount AS "redAmount",
              c.code AS code, rr.creator_id::text AS "creatorId", u.username AS "creatorUsername"
       FROM room_red_gift_redemptions rr
       LEFT JOIN room_red_gift_codes c ON c.id = rr.code_id
       LEFT JOIN users u ON u.id = rr.creator_id
       WHERE rr.redeemer_id = $1::uuid
       ORDER BY rr.redeemed_at ASC, rr.id ASC
       LIMIT $2`,
      [userId, ROOM_TIMELINE_MAX_RED]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS c FROM heart_ledger
       WHERE user_id = $1::uuid AND kind = 'game_start'`,
      [userId]
    ),
    pool.query(
      `SELECT id::text AS id, created_at AS "createdAt", label, meta
       FROM heart_ledger
       WHERE user_id = $1::uuid AND kind = 'game_start'
       ORDER BY created_at ASC, id ASC
       LIMIT $2`,
      [userId, ROOM_TIMELINE_MAX_GAME]
    )
  ]);

  const totalRed = redCountRes.rows[0]?.c ?? 0;
  const totalGame = gameCountRes.rows[0]?.c ?? 0;
  const redemptionsTruncated = redRes.rows.length < totalRed;
  const gamesTruncated = ledRes.rows.length < totalGame;
  const historyIncomplete = redemptionsTruncated || gamesTruncated;

  const balanceByCreator = new Map();
  for (const row of balRes.rows) {
    const cid = String(row.creatorId);
    balanceByCreator.set(cid, {
      balance: Math.max(0, Math.floor(Number(row.balance) || 0)),
      username:
        row.creatorUsername != null
          ? String(row.creatorUsername).trim().toLowerCase()
          : ""
    });
  }

  /** @type {{ ts: number; sort: number; id: string; creatorId: string; delta: number; itemLine: string; gameId: string | null }[]} */
  const events = [];

  for (const row of redRes.rows) {
    const cid = row.creatorId != null ? String(row.creatorId) : "";
    const amt = Math.max(0, Math.floor(Number(row.redAmount) || 0));
    if (!cid || amt <= 0) continue;
    const code =
      row.code != null ? String(row.code).trim().toUpperCase() : "";
    const cu =
      row.creatorUsername != null
        ? String(row.creatorUsername).trim().replace(/^@+/, "").toLowerCase()
        : "";
    const ts = row.redeemedAt ? new Date(row.redeemedAt).getTime() : 0;
    events.push({
      ts: Number.isFinite(ts) ? ts : 0,
      sort: 0,
      id: `redeem-${row.id}`,
      creatorId: cid,
      delta: amt,
      itemLine: `แลกรหัส ${code || "—"} · รับแดงห้อง${cu ? ` จาก @${cu}` : ""}`,
      gameId: null
    });
  }

  for (const row of ledRes.rows) {
    const meta = normalizeLedgerMeta(row.meta);
    const gifts = meta?.redFromRoomGifts;
    if (!gifts || typeof gifts !== "object" || Array.isArray(gifts)) continue;
    const gid =
      meta.gameId != null ? String(meta.gameId).trim() : null;
    const itemLine = gameItemLineFromLedgerRow(row.label, meta);
    const ts = row.createdAt ? new Date(row.createdAt).getTime() : 0;
    const tsSafe = Number.isFinite(ts) ? ts : 0;
    for (const [cidRaw, v] of Object.entries(gifts)) {
      const cid = String(cidRaw);
      const deducted = Math.max(0, Math.floor(Number(v) || 0));
      if (!cid || deducted <= 0) continue;
      events.push({
        ts: tsSafe,
        sort: 1,
        id: `game-${row.id}-${cid}`,
        creatorId: cid,
        delta: -deducted,
        itemLine,
        gameId: gid || null
      });
    }
  }

  events.sort((a, b) => {
    if (a.ts !== b.ts) return a.ts - b.ts;
    if (a.sort !== b.sort) return a.sort - b.sort;
    return a.id.localeCompare(b.id);
  });

  const byCreator = new Map();
  for (const ev of events) {
    const list = byCreator.get(ev.creatorId) || [];
    list.push(ev);
    byCreator.set(ev.creatorId, list);
  }

  for (const cid of byCreator.keys()) {
    if (!balanceByCreator.has(cid)) {
      balanceByCreator.set(cid, { balance: 0, username: "" });
    }
  }

  const creatorIds = [...balanceByCreator.keys()].sort((a, b) => a.localeCompare(b));

  const rooms = [];
  for (const creatorId of creatorIds) {
    const meta = balanceByCreator.get(creatorId) || { balance: 0, username: "" };
    const evs = byCreator.get(creatorId) || [];
    let running = 0;
    /** @type {object[]} */
    const chronological = [];
    for (const ev of evs) {
      running += ev.delta;
      if (running < 0) running = 0;
      const when = ev.ts
        ? new Date(ev.ts).toLocaleString("th-TH", {
            dateStyle: "medium",
            timeStyle: "short"
          })
        : "—";
      chronological.push({
        key: ev.id,
        when,
        itemLine: ev.itemLine,
        delta: ev.delta,
        balanceAfter: running,
        gameId: ev.gameId
      });
    }

    const expected = meta.balance;
    let reconciled = false;
    if (!historyIncomplete) {
      if (evs.length === 0) {
        reconciled = expected === 0;
      } else {
        reconciled = running === expected;
      }
    }

    const rows = chronological.slice().reverse();

    rooms.push({
      creatorId,
      creatorUsername: meta.username || creatorId.slice(0, 8),
      currentBalance: expected,
      reconciled,
      historyIncomplete,
      rows
    });
  }

  return { rooms, historyIncomplete };
}

/**
 * ประวัติการแลกรหัสหัวใจแดงของสมาชิก (สำหรับแอดมินตรวจสอบ)
 */
async function listRedemptionsForUser(userId, limit = 200) {
  const pool = getPool();
  if (!pool) return [];
  const lim = Math.min(1000, Math.max(1, Math.floor(Number(limit) || 200)));
  const r = await pool.query(
    `SELECT rr.id,
            rr.redeemed_at AS "redeemedAt",
            rr.red_amount AS "redAmount",
            rr.code_id AS "codeId",
            c.code AS code,
            rr.creator_id AS "creatorId",
            u.username AS "creatorUsername"
     FROM room_red_gift_redemptions rr
     LEFT JOIN room_red_gift_codes c ON c.id = rr.code_id
     LEFT JOIN users u ON u.id = rr.creator_id
     WHERE rr.redeemer_id = $1::uuid
     ORDER BY rr.redeemed_at DESC
     LIMIT $2`,
    [userId, lim]
  );
  return r.rows.map((row) => ({
    id: String(row.id),
    redeemedAt: row.redeemedAt,
    redAmount: Math.max(0, Math.floor(Number(row.redAmount) || 0)),
    codeId: row.codeId != null ? String(row.codeId) : null,
    code: row.code != null ? String(row.code).trim().toUpperCase() : null,
    creatorId: row.creatorId != null ? String(row.creatorId) : null,
    creatorUsername:
      row.creatorUsername != null ? String(row.creatorUsername).trim().toLowerCase() : null
  }));
}

/**
 * แลกรหัส — เพิ่มยอดใน user_room_red_balance ภายใต้ creator ของรหัส
 */
async function redeemCode(redeemerUserId, rawCode) {
  const pool = getPool();
  if (!pool) {
    const e = new Error("การแลกรหัสต้องใช้ PostgreSQL");
    e.code = "DB_REQUIRED";
    throw e;
  }
  const code = String(rawCode || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  if (code.length < 4) {
    const e = new Error("กรุณากรอกรหัสให้ถูกต้อง");
    e.code = "VALIDATION";
    throw e;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const cRes = await client.query(
      `SELECT c.*, u.username AS creator_username
       FROM room_red_gift_codes c
       LEFT JOIN users u ON u.id = c.creator_id
       WHERE c.code = $1
       FOR UPDATE OF c`,
      [code]
    );
    if (cRes.rows.length === 0) {
      await client.query("ROLLBACK");
      const e = new Error("ไม่พบรหัสนี้");
      e.code = "NOT_FOUND";
      throw e;
    }
    const c = cRes.rows[0];
    if (c.expires_at && new Date(c.expires_at).getTime() < Date.now()) {
      await client.query("ROLLBACK");
      const e = new Error("รหัสนี้หมดอายุแล้ว");
      e.code = "EXPIRED";
      throw e;
    }
    if (c.canceled_at) {
      await client.query("ROLLBACK");
      const e = new Error("รหัสนี้ถูกยกเลิกแล้ว");
      e.code = "CANCELED";
      throw e;
    }
    if (Number(c.uses_count) >= Number(c.max_uses)) {
      await client.query("ROLLBACK");
      const e = new Error("รหัสนี้ถูกใช้ครบจำนวนแล้ว");
      e.code = "EXHAUSTED";
      throw e;
    }
    if (String(c.creator_id) === String(redeemerUserId)) {
      await client.query("ROLLBACK");
      const e = new Error("ไม่สามารถแลกรหัสของตัวเองได้");
      e.code = "VALIDATION";
      throw e;
    }

    await client.query(
      `UPDATE room_red_gift_codes SET uses_count = uses_count + 1 WHERE id = $1`,
      [c.id]
    );

    const amt = Math.max(1, Math.floor(Number(c.red_amount) || 0));
    const balRes = await client.query(
      `INSERT INTO user_room_red_balance (user_id, creator_id, balance)
       VALUES ($1::uuid, $2::uuid, $3)
       ON CONFLICT (user_id, creator_id) DO UPDATE SET
         balance = user_room_red_balance.balance + EXCLUDED.balance,
         updated_at = NOW()
       RETURNING balance`,
      [redeemerUserId, c.creator_id, amt]
    );
    await client.query(
      `INSERT INTO room_red_gift_redemptions (id, code_id, creator_id, redeemer_id, red_amount)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5)`,
      [crypto.randomUUID(), c.id, c.creator_id, redeemerUserId, amt]
    );
    const uRes = await client.query(
      `SELECT pink_hearts_balance, red_hearts_balance
       FROM users
       WHERE id = $1::uuid`,
      [redeemerUserId]
    );
    const pinkAfter = Math.max(0, Math.floor(Number(uRes.rows[0]?.pink_hearts_balance) || 0));
    const redAfter = Math.max(0, Math.floor(Number(uRes.rows[0]?.red_hearts_balance) || 0));
    const roomAfter = Math.max(
      0,
      Math.floor(
        Number(
          balRes.rows?.[0]?.balance ??
            balRes.rows?.[0]?.room_red_balance ??
            balRes.rows?.[0]?.user_room_red_balance
        ) || 0
      )
    );
    await heartLedgerService.insertWithClient(client, {
      userId: redeemerUserId,
      pinkDelta: 0,
      redDelta: 0,
      pinkAfter,
      redAfter,
      kind: "room_red_code_redeem",
      label: "แลกรหัสห้อง · ได้หัวใจแดง",
      meta: {
        codeId: c.id != null ? String(c.id) : null,
        code: c.code != null ? String(c.code).trim().toUpperCase() : null,
        creatorId: c.creator_id != null ? String(c.creator_id) : null,
        creatorUsername:
          c.creator_username != null ? String(c.creator_username).trim().toLowerCase() : null,
        roomRedAdded: amt,
        roomRedBalanceAfter: roomAfter
      }
    });

    await client.query("COMMIT");

    return {
      ok: true,
      redAdded: amt,
      creatorId: String(c.creator_id),
      code: c.code
    };
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

module.exports = {
  issueRoomRedGiftCodes,
  deleteCodeByCreator,
  getCodesBatchDetailForCreator,
  listCodesForCreator,
  listRoomGiftBalancesForUser,
  listRoomRedRoomTimelineForRedeemer,
  listRedemptionsForUser,
  redeemCode
};
