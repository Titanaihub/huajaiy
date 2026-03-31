const crypto = require("crypto");
const { getPool } = require("../db/pool");

function rowToPackage(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    pinkQty: Math.max(0, Math.floor(Number(row.pink_qty) || 0)),
    redQty: Math.max(0, Math.floor(Number(row.red_qty) || 0)),
    priceThb: Math.max(0, Math.floor(Number(row.price_thb) || 0)),
    active: Boolean(row.active),
    sortOrder: Math.floor(Number(row.sort_order) || 0),
    createdAt: row.created_at,
    retired: Boolean(row.retired),
    paymentAccountName: row.payment_account_name
      ? String(row.payment_account_name).trim()
      : "",
    paymentAccountNumber: row.payment_account_number
      ? String(row.payment_account_number).trim()
      : "",
    paymentBankName: row.payment_bank_name ? String(row.payment_bank_name).trim() : "",
    paymentQrUrl: row.payment_qr_url ? String(row.payment_qr_url).trim() : ""
  };
}

function hasPaymentDestination(p) {
  return (
    p.paymentAccountName &&
    p.paymentAccountNumber &&
    p.paymentBankName &&
    /^https?:\/\//i.test(p.paymentQrUrl || "")
  );
}

async function listActive() {
  const pool = getPool();
  if (!pool) {
    const err = new Error("DB_REQUIRED");
    err.code = "DB_REQUIRED";
    throw err;
  }
  const r = await pool.query(
    `SELECT * FROM heart_packages
     WHERE active = TRUE AND COALESCE(retired, FALSE) = FALSE
       AND trim(COALESCE(payment_account_name, '')) <> ''
       AND trim(COALESCE(payment_account_number, '')) <> ''
       AND trim(COALESCE(payment_bank_name, '')) <> ''
       AND trim(COALESCE(payment_qr_url, '')) <> ''
     ORDER BY sort_order ASC, created_at ASC`
  );
  return r.rows.map(rowToPackage).filter(hasPaymentDestination);
}

async function listAllAdmin() {
  const pool = getPool();
  if (!pool) {
    const err = new Error("DB_REQUIRED");
    err.code = "DB_REQUIRED";
    throw err;
  }
  const r = await pool.query(
    `SELECT * FROM heart_packages ORDER BY sort_order ASC, created_at DESC`
  );
  return r.rows.map(rowToPackage);
}

async function findById(id) {
  const pool = getPool();
  if (!pool) return null;
  const r = await pool.query(`SELECT * FROM heart_packages WHERE id = $1`, [id]);
  if (r.rows.length === 0) return null;
  return rowToPackage(r.rows[0]);
}

async function create({
  title,
  description = "",
  pinkQty = 0,
  redQty = 0,
  priceThb = 0,
  sortOrder = 0,
  active = true,
  paymentAccountName = "",
  paymentAccountNumber = "",
  paymentBankName = "",
  paymentQrUrl = ""
}) {
  const pool = getPool();
  if (!pool) {
    const err = new Error("DB_REQUIRED");
    err.code = "DB_REQUIRED";
    throw err;
  }
  const id = crypto.randomUUID();
  const pq = Math.max(0, Math.floor(Number(pinkQty) || 0));
  const rq = Math.max(0, Math.floor(Number(redQty) || 0));
  const pr = Math.max(0, Math.floor(Number(priceThb) || 0));
  const so = Math.floor(Number(sortOrder) || 0);
  const t = String(title || "").trim().slice(0, 160);
  if (!t) {
    const e = new Error("ต้องมีชื่อแพ็กเกจ");
    e.code = "VALIDATION";
    throw e;
  }
  if (pq > 0) {
    const e = new Error("แพ็กจากแอดมินขายได้เฉพาะหัวใจแดง (เข้ายอดแจก) — หัวใจชมพูได้จากกิจกรรม/รหัสพิเศษเท่านั้น");
    e.code = "VALIDATION";
    throw e;
  }
  if (rq <= 0) {
    const e = new Error("ต้องกำหนดจำนวนหัวใจแดง (แจก) อย่างน้อย 1");
    e.code = "VALIDATION";
    throw e;
  }
  const pan = String(paymentAccountName || "").trim().slice(0, 200);
  const pnum = String(paymentAccountNumber || "").trim().slice(0, 64);
  const pbank = String(paymentBankName || "").trim().slice(0, 160);
  const pqr = String(paymentQrUrl || "").trim().slice(0, 2000);
  if (!pan || !pnum || !pbank) {
    const e = new Error("ต้องกรอกชื่อบัญชี หมายเลขบัญชี และชื่อธนาคารสำหรับรับโอน");
    e.code = "VALIDATION";
    throw e;
  }
  if (!/^https?:\/\//i.test(pqr)) {
    const e = new Error("ต้องอัปโหลด QR โค้ด (ได้ URL รูป) สำหรับสแกนจ่าย");
    e.code = "VALIDATION";
    throw e;
  }
  const r = await pool.query(
    `INSERT INTO heart_packages (
       id, title, description, pink_qty, red_qty, price_thb, active, sort_order,
       payment_account_name, payment_account_number, payment_bank_name, payment_qr_url
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [id, t, String(description || "").slice(0, 4000), pq, rq, pr, Boolean(active), so, pan, pnum, pbank, pqr]
  );
  return rowToPackage(r.rows[0]);
}

async function update(id, patch) {
  const pool = getPool();
  if (!pool) {
    const err = new Error("DB_REQUIRED");
    err.code = "DB_REQUIRED";
    throw err;
  }
  const cur = await findById(id);
  if (!cur) return null;
  const title =
    patch.title != null ? String(patch.title).trim().slice(0, 160) : cur.title;
  const description =
    patch.description != null
      ? String(patch.description).slice(0, 4000)
      : cur.description;
  const pinkQty =
    patch.pinkQty != null
      ? Math.max(0, Math.floor(Number(patch.pinkQty) || 0))
      : cur.pinkQty;
  const redQty =
    patch.redQty != null
      ? Math.max(0, Math.floor(Number(patch.redQty) || 0))
      : cur.redQty;
  const priceThb =
    patch.priceThb != null
      ? Math.max(0, Math.floor(Number(patch.priceThb) || 0))
      : cur.priceThb;
  const sortOrder =
    patch.sortOrder != null
      ? Math.floor(Number(patch.sortOrder) || 0)
      : cur.sortOrder;
  let retired = cur.retired;
  if (patch.retirePermanently === true) {
    retired = true;
  }
  const paymentAccountName =
    patch.paymentAccountName != null
      ? String(patch.paymentAccountName).trim().slice(0, 200)
      : cur.paymentAccountName;
  const paymentAccountNumber =
    patch.paymentAccountNumber != null
      ? String(patch.paymentAccountNumber).trim().slice(0, 64)
      : cur.paymentAccountNumber;
  const paymentBankName =
    patch.paymentBankName != null
      ? String(patch.paymentBankName).trim().slice(0, 160)
      : cur.paymentBankName;
  const paymentQrUrl =
    patch.paymentQrUrl != null
      ? String(patch.paymentQrUrl).trim().slice(0, 2000)
      : cur.paymentQrUrl;

  let active = patch.active != null ? Boolean(patch.active) : cur.active;
  if (retired) {
    active = false;
  }
  if (cur.retired && patch.active === true) {
    const e = new Error("แพ็กนี้หยุดขายถาวรแล้ว — ไม่สามารถเปิดการขายอีก");
    e.code = "VALIDATION";
    throw e;
  }
  if (!title) {
    const e = new Error("ต้องมีชื่อแพ็กเกจ");
    e.code = "VALIDATION";
    throw e;
  }
  if (pinkQty > 0) {
    const e = new Error("แพ็กจากแอดมินขายได้เฉพาะหัวใจแดง (เข้ายอดแจก) — หัวใจชมพูได้จากกิจกรรม/รหัสพิเศษเท่านั้น");
    e.code = "VALIDATION";
    throw e;
  }
  if (redQty <= 0) {
    const e = new Error("ต้องกำหนดจำนวนหัวใจแดง (แจก) อย่างน้อย 1");
    e.code = "VALIDATION";
    throw e;
  }
  const r = await pool.query(
    `UPDATE heart_packages SET
      title = $2, description = $3, pink_qty = $4, red_qty = $5,
      price_thb = $6, active = $7, sort_order = $8, retired = $9,
      payment_account_name = $10, payment_account_number = $11,
      payment_bank_name = $12, payment_qr_url = $13
    WHERE id = $1 RETURNING *`,
    [
      id,
      title,
      description,
      pinkQty,
      redQty,
      priceThb,
      active,
      sortOrder,
      retired,
      paymentAccountName || null,
      paymentAccountNumber || null,
      paymentBankName || null,
      paymentQrUrl || null
    ]
  );
  return rowToPackage(r.rows[0]);
}

/**
 * ลบแพ็กเกจ — ถ้ามี heart_purchases อ้างอิงจะลบไม่ได้ (FK RESTRICT)
 */
async function removeById(id) {
  const pool = getPool();
  if (!pool) {
    const err = new Error("DB_REQUIRED");
    err.code = "DB_REQUIRED";
    throw err;
  }
  const cur = await findById(id);
  if (!cur) return null;
  const cnt = await pool.query(
    `SELECT COUNT(*)::int AS c FROM heart_purchases WHERE package_id = $1::uuid`,
    [id]
  );
  const n = Math.max(0, Number(cnt.rows[0]?.c) || 0);
  if (n > 0) {
    const e = new Error(
      `ลบไม่ได้ — มีประวัติการซื้อแพ็กนี้ ${n} รายการ · ใช้「หยุดขายถาวร」แทน หรือติดต่อผู้พัฒนา`
    );
    e.code = "CONFLICT";
    throw e;
  }
  await pool.query(`DELETE FROM heart_packages WHERE id = $1::uuid`, [id]);
  return cur;
}

module.exports = {
  listActive,
  listAllAdmin,
  findById,
  create,
  update,
  removeById
};
