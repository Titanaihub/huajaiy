const crypto = require("crypto");
const { getPool } = require("../db/pool");
const heartLedgerService = require("./heartLedgerService");
const heartPackageService = require("./heartPackageService");

function rowToPurchase(row) {
  return {
    id: row.id,
    userId: row.user_id,
    packageId: row.package_id,
    pinkQty: Math.max(0, Math.floor(Number(row.pink_qty) || 0)),
    redQty: Math.max(0, Math.floor(Number(row.red_qty) || 0)),
    priceThbSnapshot: Math.max(0, Math.floor(Number(row.price_thb_snapshot) || 0)),
    slipUrl: row.slip_url != null ? String(row.slip_url).trim() || null : null,
    status: row.status,
    adminNote: row.admin_note || null,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at || null,
    resolvedBy: row.resolved_by || null
  };
}

function rowToMine(row) {
  const base = rowToPurchase(row);
  return {
    ...base,
    packageTitle: row.package_title != null ? String(row.package_title).trim() : "",
    paymentAccountName:
      row.payment_account_name != null ? String(row.payment_account_name).trim() : "",
    paymentAccountNumber:
      row.payment_account_number != null ? String(row.payment_account_number).trim() : "",
    paymentBankName:
      row.payment_bank_name != null ? String(row.payment_bank_name).trim() : "",
    paymentQrUrl: row.payment_qr_url != null ? String(row.payment_qr_url).trim() : ""
  };
}

async function hasPendingForUser(userId) {
  const pool = getPool();
  if (!pool) return false;
  const r = await pool.query(
    `SELECT 1 FROM heart_purchases WHERE user_id = $1 AND status = 'pending' LIMIT 1`,
    [userId]
  );
  return r.rows.length > 0;
}

function normalizeSlipUrl(slipUrl) {
  const raw = slipUrl != null ? String(slipUrl).trim().slice(0, 2000) : "";
  if (!raw) return null;
  if (!raw.startsWith("https://") && !raw.startsWith("http://")) {
    const e = new Error("ต้องแนบ URL รูปสลิป (https)");
    e.code = "VALIDATION";
    throw e;
  }
  return raw;
}

async function createPurchase(userId, packageId, slipUrl) {
  const pool = getPool();
  if (!pool) {
    const err = new Error("DB_REQUIRED");
    err.code = "DB_REQUIRED";
    throw err;
  }
  const url = normalizeSlipUrl(slipUrl);
  if (await hasPendingForUser(userId)) {
    const e = new Error(
      "มีรายการสั่งซื้อหัวใจที่ยังไม่จบอยู่แล้ว — แนบสลิปหรือรอแอดมินอนุมัติก่อนสั่งใหม่"
    );
    e.code = "PENDING_EXISTS";
    throw e;
  }
  const pkg = await heartPackageService.findById(packageId);
  if (!pkg || !pkg.active) {
    const e = new Error("ไม่พบแพ็กเกจหรือปิดการขาย");
    e.code = "PACKAGE_INVALID";
    throw e;
  }
  if (pkg.pinkQty > 0) {
    const e = new Error(
      "แพ็กนี้ไม่รองรับการซื้อ — ขายได้เฉพาะหัวใจแดง (เข้ายอดแจก) จากแอดมิน"
    );
    e.code = "PACKAGE_INVALID";
    throw e;
  }
  if (pkg.redQty <= 0) {
    const e = new Error("แพ็กเกจไม่ถูกต้อง");
    e.code = "PACKAGE_INVALID";
    throw e;
  }
  const id = crypto.randomUUID();
  const r = await pool.query(
    `INSERT INTO heart_purchases (
      id, user_id, package_id, pink_qty, red_qty, price_thb_snapshot, slip_url, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
    RETURNING *`,
    [id, userId, packageId, pkg.pinkQty, pkg.redQty, pkg.priceThb, url]
  );
  return rowToPurchase(r.rows[0]);
}

async function attachSlip(userId, purchaseId, slipUrl) {
  const pool = getPool();
  if (!pool) {
    const err = new Error("DB_REQUIRED");
    err.code = "DB_REQUIRED";
    throw err;
  }
  const url = normalizeSlipUrl(slipUrl);
  if (!url) {
    const e = new Error("ต้องแนบ URL รูปสลิป (https)");
    e.code = "VALIDATION";
    throw e;
  }
  const r = await pool.query(
    `UPDATE heart_purchases SET slip_url = $1
     WHERE id = $2 AND user_id = $3 AND status = 'pending'
       AND slip_url IS NULL
     RETURNING *`,
    [url, purchaseId, userId]
  );
  if (r.rows.length === 0) {
    const e = new Error("ไม่พบรายการ แนบสลิปแล้ว หรือไม่สามารถแก้ไขได้");
    e.code = "NOT_FOUND";
    throw e;
  }
  return rowToPurchase(r.rows[0]);
}

async function listMine(userId, limit = 50) {
  const pool = getPool();
  if (!pool) {
    const err = new Error("DB_REQUIRED");
    err.code = "DB_REQUIRED";
    throw err;
  }
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const r = await pool.query(
    `SELECT p.*,
            pk.title AS package_title,
            pk.payment_account_name,
            pk.payment_account_number,
            pk.payment_bank_name,
            pk.payment_qr_url
     FROM heart_purchases p
     JOIN heart_packages pk ON pk.id = p.package_id
     WHERE p.user_id = $1
     ORDER BY p.created_at DESC
     LIMIT $2`,
    [userId, lim]
  );
  return r.rows.map(rowToMine);
}

/**
 * ประวัติการสั่งซื้อทั้งหมด (แอดมิน) — รองรับค้นหาและแบ่งหน้า
 * @param {{ limit?: number, offset?: number, status?: 'approved'|'rejected'|'pending'|null, q?: string }} options
 */
async function listHistoryForAdmin(options = {}) {
  const pool = getPool();
  if (!pool) {
    const err = new Error("DB_REQUIRED");
    err.code = "DB_REQUIRED";
    throw err;
  }
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 200);
  const offset = Math.max(0, Math.floor(Number(options.offset) || 0));
  const st = options.status != null ? String(options.status).trim().toLowerCase() : "";
  const statusFilter =
    st === "approved" || st === "rejected" || st === "pending" ? st : null;
  const qRaw = options.q != null ? String(options.q).trim().slice(0, 80) : "";
  const q = qRaw ? `%${qRaw}%` : null;

  const cond = [];
  const params = [];
  if (statusFilter) {
    params.push(statusFilter);
    cond.push(`p.status = $${params.length}`);
  }
  if (q) {
    params.push(q);
    const n = params.length;
    cond.push(
      `(u.username ILIKE $${n} OR COALESCE(u.first_name, '') ILIKE $${n} OR COALESCE(u.last_name, '') ILIKE $${n})`
    );
  }
  const whereSql = cond.length ? `WHERE ${cond.join(" AND ")}` : "";

  const countSql = `
    SELECT
      COUNT(*)::int AS total,
      COALESCE(SUM(p.price_thb_snapshot), 0)::bigint AS sum_price_thb,
      COALESCE(SUM(CASE WHEN p.status = 'approved' THEN p.red_qty ELSE 0 END), 0)::bigint AS sum_red_approved,
      COALESCE(SUM(CASE WHEN p.status = 'approved' THEN p.pink_qty ELSE 0 END), 0)::bigint AS sum_pink_approved
    FROM heart_purchases p
    JOIN users u ON u.id = p.user_id
    ${whereSql}
  `;
  const countR = await pool.query(countSql, params);
  const agg = countR.rows[0] || {};
  const total = Math.max(0, Math.floor(Number(agg.total) || 0));

  params.push(limit);
  const limIdx = params.length;
  params.push(offset);
  const offIdx = params.length;

  const dataSql = `
    SELECT
      p.*,
      u.username AS buyer_username,
      u.first_name AS buyer_first_name,
      u.last_name AS buyer_last_name,
      pk.title AS package_title,
      adm.username AS resolver_username
    FROM heart_purchases p
    JOIN users u ON u.id = p.user_id
    JOIN heart_packages pk ON pk.id = p.package_id
    LEFT JOIN users adm ON adm.id = p.resolved_by
    ${whereSql}
    ORDER BY p.created_at DESC
    LIMIT $${limIdx} OFFSET $${offIdx}
  `;
  const dataR = await pool.query(dataSql, params);
  const purchases = dataR.rows.map((row) => ({
    ...rowToPurchase(row),
    buyerUsername: row.buyer_username,
    buyerFirstName: row.buyer_first_name,
    buyerLastName: row.buyer_last_name,
    packageTitle: row.package_title,
    resolverUsername: row.resolver_username || null
  }));

  return {
    purchases,
    total,
    limit,
    offset,
    summary: {
      sumPriceThb: Math.max(0, Number(agg.sum_price_thb) || 0),
      sumRedApproved: Math.max(0, Number(agg.sum_red_approved) || 0),
      sumPinkApproved: Math.max(0, Number(agg.sum_pink_approved) || 0)
    }
  };
}

async function listPendingForAdmin(limit = 100) {
  const pool = getPool();
  if (!pool) {
    const err = new Error("DB_REQUIRED");
    err.code = "DB_REQUIRED";
    throw err;
  }
  const lim = Math.min(Math.max(Number(limit) || 100, 1), 200);
  const r = await pool.query(
    `SELECT p.*, u.username AS buyer_username,
            u.first_name AS buyer_first_name, u.last_name AS buyer_last_name,
            pk.title AS package_title
     FROM heart_purchases p
     JOIN users u ON u.id = p.user_id
     JOIN heart_packages pk ON pk.id = p.package_id
     WHERE p.status = 'pending'
       AND p.slip_url IS NOT NULL
       AND trim(COALESCE(p.slip_url, '')) <> ''
     ORDER BY p.created_at ASC
     LIMIT $1`,
    [lim]
  );
  return r.rows.map((row) => ({
    ...rowToPurchase(row),
    buyerUsername: row.buyer_username,
    buyerFirstName: row.buyer_first_name,
    buyerLastName: row.buyer_last_name,
    packageTitle: row.package_title
  }));
}

async function findById(id) {
  const pool = getPool();
  if (!pool) return null;
  const r = await pool.query(`SELECT * FROM heart_purchases WHERE id = $1`, [id]);
  if (r.rows.length === 0) return null;
  return rowToPurchase(r.rows[0]);
}

async function approve(purchaseId, adminUserId, note) {
  const pool = getPool();
  if (!pool) {
    const err = new Error("DB_REQUIRED");
    err.code = "DB_REQUIRED";
    throw err;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const lock = await client.query(
      `SELECT * FROM heart_purchases WHERE id = $1 FOR UPDATE`,
      [purchaseId]
    );
    if (lock.rows.length === 0) {
      await client.query("ROLLBACK");
      const e = new Error("ไม่พบรายการ");
      e.code = "NOT_FOUND";
      throw e;
    }
    const row = lock.rows[0];
    if (row.status !== "pending") {
      await client.query("ROLLBACK");
      const e = new Error("รายการนี้ดำเนินการแล้ว");
      e.code = "BAD_STATUS";
      throw e;
    }
    const slipOk =
      row.slip_url != null && String(row.slip_url).trim().length > 0;
    if (!slipOk) {
      await client.query("ROLLBACK");
      const e = new Error("รายการนี้ยังไม่มีสลิป — ไม่อนุมัติได้");
      e.code = "BAD_STATUS";
      throw e;
    }
    const buyerId = row.user_id;
    // นโยบายใหม่: อนุมัติแพ็กซื้อหัวใจเพิ่มเฉพาะ "แดงแจก" เท่านั้น
    const pink = 0;
    const red = Math.max(0, Math.floor(Number(row.red_qty) || 0));
    const pkgR = await client.query(`SELECT title FROM heart_packages WHERE id = $1`, [
      row.package_id
    ]);
    const pkgTitle =
      pkgR.rows[0]?.title != null ? String(pkgR.rows[0].title).trim() : "แพ็กหัวใจ";
    const balR = await client.query(
      `UPDATE users SET
        pink_hearts_balance = GREATEST(0, COALESCE(pink_hearts_balance, 0) + $2),
        red_giveaway_balance = GREATEST(0, COALESCE(red_giveaway_balance, 0) + $3),
        hearts_balance =
          GREATEST(0, COALESCE(pink_hearts_balance, 0) + $2) +
          GREATEST(0, COALESCE(red_hearts_balance, 0)) +
          GREATEST(0, COALESCE(red_giveaway_balance, 0) + $3)
      WHERE id = $1
      RETURNING pink_hearts_balance, red_hearts_balance, red_giveaway_balance`,
      [buyerId, pink, red]
    );
    if (balR.rows.length > 0) {
      const rowB = balR.rows[0];
      const pinkAfter = Math.max(0, Math.floor(Number(rowB.pink_hearts_balance) || 0));
      const redPlayAfter = Math.max(0, Math.floor(Number(rowB.red_hearts_balance) || 0));
      const giveAfter = Math.max(0, Math.floor(Number(rowB.red_giveaway_balance) || 0));
      await heartLedgerService.insertWithClient(client, {
        userId: buyerId,
        pinkDelta: pink,
        redDelta: 0,
        pinkAfter,
        redAfter: redPlayAfter,
        kind: "heart_purchase_approved",
        label:
          red > 0
            ? `อนุมัติซื้อแพ็ก「${pkgTitle}」· แดงแจกผู้เล่น +${red}`
            : `อนุมัติซื้อแพ็ก「${pkgTitle}」`,
        meta: {
          purchaseId,
          packageId: row.package_id != null ? String(row.package_id) : null,
          packageTitle: pkgTitle,
          pinkGranted: pink,
          redGrantedToGiveaway: red,
          redGiveawayBalanceAfter: giveAfter,
          resolvedByUserId: adminUserId != null ? String(adminUserId) : null
        }
      });
    }
    const noteText =
      note != null ? String(note).trim().slice(0, 500) : null;
    await client.query(
      `UPDATE heart_purchases SET
        status = 'approved',
        resolved_at = NOW(),
        resolved_by = $2,
        admin_note = COALESCE($3, admin_note)
      WHERE id = $1`,
      [purchaseId, adminUserId, noteText]
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function reject(purchaseId, adminUserId, note) {
  const pool = getPool();
  if (!pool) {
    const err = new Error("DB_REQUIRED");
    err.code = "DB_REQUIRED";
    throw err;
  }
  const r = await pool.query(
    `UPDATE heart_purchases SET
      status = 'rejected',
      resolved_at = NOW(),
      resolved_by = $2,
      admin_note = $3
    WHERE id = $1 AND status = 'pending'
    RETURNING *`,
    [
      purchaseId,
      adminUserId,
      note != null ? String(note).trim().slice(0, 500) : null
    ]
  );
  if (r.rows.length === 0) {
    const e = new Error("ไม่พบรายการหรือดำเนินการแล้ว");
    e.code = "NOT_FOUND";
    throw e;
  }
  return rowToPurchase(r.rows[0]);
}

module.exports = {
  createPurchase,
  attachSlip,
  listMine,
  listPendingForAdmin,
  listHistoryForAdmin,
  findById,
  approve,
  reject,
  hasPendingForUser
};
