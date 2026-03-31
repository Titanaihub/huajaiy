const { getPool } = require("../db/pool");
const centralPrizeAwardService = require("./centralPrizeAwardService");
const userService = require("./userService");

function requirePool() {
  const pool = getPool();
  if (!pool) {
    const e = new Error("DB_REQUIRED");
    e.code = "DB_REQUIRED";
    throw e;
  }
  return pool;
}

function parseCashBahtFromAward(a) {
  if (!a || String(a.prizeCategory) !== "cash") return 0;
  const raw = [a.prizeValueText || "", a.prizeUnit || ""].filter(Boolean).join(" ");
  const m = String(raw).replace(/,/g, "").match(/[\d]+(?:\.[\d]+)?/);
  if (!m) return 0;
  const n = parseFloat(m[0]);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

async function sumEarnedCashBahtFromCreator(requesterUserId, creatorUsernameLower) {
  const awards = await centralPrizeAwardService.listAwardsForUser(requesterUserId);
  const cu = String(creatorUsernameLower || "").trim().toLowerCase();
  let sum = 0;
  for (const a of awards) {
    if (String(a.creatorUsername || "").trim().toLowerCase() === cu) {
      sum += parseCashBahtFromAward(a);
    }
  }
  return sum;
}

async function sumReservedBaht(requesterUserId, creatorUserId) {
  const pool = requirePool();
  const r = await pool.query(
    `SELECT COALESCE(SUM(amount_thb), 0)::bigint AS s
     FROM central_prize_withdrawal_requests
     WHERE requester_user_id = $1::uuid AND creator_user_id = $2::uuid
       AND status IN ('pending', 'approved')`,
    [requesterUserId, creatorUserId]
  );
  return Math.max(0, Number(r.rows[0]?.s) || 0);
}

/**
 * @param {string} requesterUserId
 * @param {string} creatorUsernameRaw — รวม @ หรือไม่ก็ได้
 */
async function getAvailability(requesterUserId, creatorUsernameRaw) {
  const raw = String(creatorUsernameRaw || "").trim().replace(/^@+/, "");
  if (!raw) {
    const e = new Error("ต้องระบุผู้สร้างเกม");
    e.code = "VALIDATION";
    throw e;
  }
  const creator = await userService.findByUsername(raw);
  if (!creator) {
    const e = new Error("ไม่พบผู้สร้างเกม");
    e.code = "NOT_FOUND";
    throw e;
  }
  if (String(creator.id) === String(requesterUserId)) {
    const e = new Error("ไม่สามารถขอถอนรางวัลจากบัญชีตัวเองได้");
    e.code = "VALIDATION";
    throw e;
  }
  const earned = await sumEarnedCashBahtFromCreator(requesterUserId, creator.username);
  const reserved = await sumReservedBaht(requesterUserId, creator.id);
  return {
    creatorUserId: creator.id,
    creatorUsername: creator.username,
    earnedBaht: earned,
    reservedBaht: reserved,
    availableBaht: Math.max(0, earned - reserved)
  };
}

function mapRow(row) {
  let transferDateStr = "";
  if (row.transfer_date != null) {
    const raw = row.transfer_date;
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
      transferDateStr = raw.toISOString().slice(0, 10);
    } else {
      const s = String(raw).trim();
      transferDateStr = s.length >= 10 ? s.slice(0, 10) : s;
    }
  }
  return {
    id: String(row.id),
    requesterUserId: String(row.requester_user_id),
    creatorUserId: String(row.creator_user_id),
    amountThb: Math.max(0, Math.floor(Number(row.amount_thb) || 0)),
    accountHolderName: row.account_holder_name != null ? String(row.account_holder_name) : "",
    accountNumber: row.account_number != null ? String(row.account_number) : "",
    bankName: row.bank_name != null ? String(row.bank_name) : "",
    status: row.status != null ? String(row.status) : "pending",
    creatorNote: row.creator_note != null ? String(row.creator_note) : "",
    resolvedAt: row.resolved_at || null,
    createdAt: row.created_at || null,
    transferSlipUrl: row.transfer_slip_url != null ? String(row.transfer_slip_url).trim() : "",
    transferDate: transferDateStr || null
  };
}

function mapAdminWithdrawalRow(row) {
  const base = mapRow(row);
  const fn = row.requester_first_name != null ? String(row.requester_first_name).trim() : "";
  const ln = row.requester_last_name != null ? String(row.requester_last_name).trim() : "";
  const run = row.requester_username != null ? String(row.requester_username).trim().toLowerCase() : "";
  const cun = row.creator_username != null ? String(row.creator_username).trim().toLowerCase() : "";
  return {
    ...base,
    requesterUsername: run,
    requesterDisplayName: [fn, ln].filter(Boolean).join(" ").trim() || (run ? `@${run}` : ""),
    creatorUsername: cun
  };
}

async function createRequest({
  requesterUserId,
  creatorUsername,
  amountThb,
  accountHolderName,
  accountNumber,
  bankName
}) {
  const pool = requirePool();
  const amt = Math.floor(Number(amountThb));
  if (!Number.isFinite(amt) || amt < 1) {
    const e = new Error("จำนวนเงินต้องเป็นตัวเลขบวก");
    e.code = "VALIDATION";
    throw e;
  }
  const ah = String(accountHolderName || "").trim();
  const an = String(accountNumber || "").trim();
  const bn = String(bankName || "").trim();
  if (!ah || !an || !bn) {
    const e = new Error("กรุณากรอกชื่อเจ้าของบัญชี หมายเลขบัญชี และชื่อธนาคารให้ครบ");
    e.code = "VALIDATION";
    throw e;
  }

  const avail = await getAvailability(requesterUserId, creatorUsername);
  if (amt > avail.availableBaht) {
    const e = new Error(
      `จำนวนเงินเกินยอดที่ถอนได้ (เหลือ ${avail.availableBaht} บาท)`
    );
    e.code = "INSUFFICIENT_BALANCE";
    throw e;
  }

  const ins = await pool.query(
    `INSERT INTO central_prize_withdrawal_requests (
      requester_user_id, creator_user_id, amount_thb,
      account_holder_name, account_number, bank_name, status
    ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, 'pending')
    RETURNING *`,
    [
      requesterUserId,
      avail.creatorUserId,
      amt,
      ah.slice(0, 200),
      an.slice(0, 64),
      bn.slice(0, 120)
    ]
  );
  return mapRow(ins.rows[0]);
}

async function listForRequester(userId) {
  const pool = requirePool();
  const r = await pool.query(
    `SELECT w.*, u.username AS creator_username
     FROM central_prize_withdrawal_requests w
     JOIN users u ON u.id = w.creator_user_id
     WHERE w.requester_user_id = $1::uuid
     ORDER BY w.created_at DESC`,
    [userId]
  );
  return r.rows.map((row) => ({
    ...mapRow(row),
    creatorUsername: row.creator_username != null ? String(row.creator_username) : ""
  }));
}

async function listIncomingForCreator(creatorUserId) {
  const pool = requirePool();
  const r = await pool.query(
    `SELECT w.*,
       u.username AS requester_username,
       u.first_name AS requester_first_name,
       u.last_name AS requester_last_name
     FROM central_prize_withdrawal_requests w
     JOIN users u ON u.id = w.requester_user_id
     WHERE w.creator_user_id = $1::uuid
     ORDER BY
       CASE WHEN w.status = 'pending' THEN 0 ELSE 1 END,
       w.created_at DESC`,
    [creatorUserId]
  );
  return r.rows.map((row) => {
    const base = mapRow(row);
    const fn = row.requester_first_name != null ? String(row.requester_first_name).trim() : "";
    const ln = row.requester_last_name != null ? String(row.requester_last_name).trim() : "";
    const display = [fn, ln].filter(Boolean).join(" ").trim();
    const un =
      row.requester_username != null ? String(row.requester_username).trim().toLowerCase() : "";
    return {
      ...base,
      requesterUsername: un,
      requesterDisplayName: display || (un ? `@${un}` : "")
    };
  });
}

async function countGamesCreatedBy(userId) {
  const pool = requirePool();
  const r = await pool.query(
    `SELECT COUNT(*)::int AS n FROM central_games WHERE created_by = $1::uuid`,
    [userId]
  );
  return Math.max(0, Math.floor(Number(r.rows[0]?.n) || 0));
}

/** ผู้ขอถอนยกเลิกคำขอที่ยัง pending */
async function cancelByRequester({ withdrawalId, requesterUserId }) {
  const pool = requirePool();
  const up = await pool.query(
    `UPDATE central_prize_withdrawal_requests
     SET status = 'cancelled',
         resolved_at = NOW()
     WHERE id = $1::uuid
       AND requester_user_id = $2::uuid
       AND status = 'pending'
     RETURNING *`,
    [withdrawalId, requesterUserId]
  );
  if (up.rows.length === 0) {
    const e = new Error("ไม่พบคำขอหรือดำเนินการแล้ว");
    e.code = "NOT_FOUND";
    throw e;
  }
  return mapRow(up.rows[0]);
}

async function resolveByCreator({
  withdrawalId,
  creatorUserId,
  action,
  note,
  transferSlipUrl,
  transferDate
}) {
  const pool = requirePool();
  const act = String(action || "").toLowerCase();
  if (act !== "approve" && act !== "reject") {
    const e = new Error("action ต้องเป็น approve หรือ reject");
    e.code = "VALIDATION";
    throw e;
  }
  const nextStatus = act === "approve" ? "approved" : "rejected";
  let slipTrim = "";
  if (act === "approve" && transferSlipUrl != null) {
    slipTrim = String(transferSlipUrl).trim().slice(0, 800);
    if (slipTrim && !/^https?:\/\//i.test(slipTrim)) {
      const err = new Error("URL สลิปต้องเป็น https หรือ http");
      err.code = "VALIDATION";
      throw err;
    }
  }
  let dateParam = null;
  if (act === "approve" && transferDate != null && String(transferDate).trim()) {
    const d = String(transferDate).trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const err = new Error("รูปแบบวันที่โอนไม่ถูกต้อง (ใช้ ปี-เดือน-วัน)");
      err.code = "VALIDATION";
      throw err;
    }
    dateParam = d;
  }
  const r = await pool.query(
    `SELECT * FROM central_prize_withdrawal_requests WHERE id = $1::uuid`,
    [withdrawalId]
  );
  if (r.rows.length === 0) {
    const e = new Error("ไม่พบคำขอ");
    e.code = "NOT_FOUND";
    throw e;
  }
  const row = r.rows[0];
  if (String(row.creator_user_id) !== String(creatorUserId)) {
    const e = new Error("คุณไม่ใช่ผู้สร้างเกมของคำขอนี้");
    e.code = "FORBIDDEN";
    throw e;
  }
  if (String(row.status) !== "pending") {
    const e = new Error("คำขอนี้ดำเนินการแล้ว");
    e.code = "VALIDATION";
    throw e;
  }
  const noteTrim = note != null ? String(note).trim().slice(0, 500) : "";
  const up = await pool.query(
    `UPDATE central_prize_withdrawal_requests
     SET status = $2,
         creator_note = CASE WHEN $3 = '' THEN creator_note ELSE $3 END,
         resolved_at = NOW(),
         transfer_slip_url = CASE
           WHEN $2 = 'approved' AND $5 <> '' THEN $5
           ELSE transfer_slip_url
         END,
         transfer_date = CASE
           WHEN $2 = 'approved' AND $6 IS NOT NULL THEN $6::date
           ELSE transfer_date
         END
     WHERE id = $1::uuid AND creator_user_id = $4::uuid AND status = 'pending'
     RETURNING *`,
    [withdrawalId, nextStatus, noteTrim, creatorUserId, slipTrim, dateParam]
  );
  if (up.rows.length === 0) {
    const e = new Error("อัปเดตไม่สำเร็จ");
    e.code = "CONFLICT";
    throw e;
  }
  return mapRow(up.rows[0]);
}

async function listPendingWithdrawalsForAdmin() {
  const pool = requirePool();
  const r = await pool.query(
    `SELECT w.*,
       ru.username AS requester_username,
       ru.first_name AS requester_first_name,
       ru.last_name AS requester_last_name,
       cu.username AS creator_username
     FROM central_prize_withdrawal_requests w
     JOIN users ru ON ru.id = w.requester_user_id
     JOIN users cu ON cu.id = w.creator_user_id
     WHERE w.status = 'pending'
     ORDER BY w.created_at ASC`
  );
  return r.rows.map((row) => mapAdminWithdrawalRow(row));
}

async function listAllWithdrawalsForAdmin({ limit = 5000 } = {}) {
  const pool = requirePool();
  const lim = Math.min(20000, Math.max(1, Math.floor(Number(limit) || 5000)));
  const r = await pool.query(
    `SELECT w.*,
       ru.username AS requester_username,
       ru.first_name AS requester_first_name,
       ru.last_name AS requester_last_name,
       cu.username AS creator_username
     FROM central_prize_withdrawal_requests w
     JOIN users ru ON ru.id = w.requester_user_id
     JOIN users cu ON cu.id = w.creator_user_id
     ORDER BY w.created_at DESC
     LIMIT $1`,
    [lim]
  );
  return r.rows.map((row) => mapAdminWithdrawalRow(row));
}

async function withdrawalReserveTotalsByRequester() {
  const pool = requirePool();
  const r = await pool.query(
    `SELECT requester_user_id::text AS uid,
       COALESCE(SUM(CASE WHEN status = 'approved' THEN amount_thb ELSE 0 END), 0)::bigint AS approved_baht,
       COALESCE(SUM(CASE WHEN status = 'pending' THEN amount_thb ELSE 0 END), 0)::bigint AS pending_baht
     FROM central_prize_withdrawal_requests
     GROUP BY requester_user_id`
  );
  return r.rows.map((row) => ({
    requesterUserId: String(row.uid),
    approvedBaht: Math.max(0, Number(row.approved_baht) || 0),
    pendingBaht: Math.max(0, Number(row.pending_baht) || 0)
  }));
}

/**
 * แอดมินอนุมัติ/ปฏิเสธคำขอถอน (ไม่จำกัดเฉพาะผู้สร้างเกม)
 * @param {{ withdrawalId: string, action: 'approve'|'reject', note?: string, transferSlipUrl?: string }} p
 */
async function resolveByAdmin({ withdrawalId, action, note, transferSlipUrl }) {
  const pool = requirePool();
  const act = String(action || "").toLowerCase();
  if (act !== "approve" && act !== "reject") {
    const e = new Error("action ต้องเป็น approve หรือ reject");
    e.code = "VALIDATION";
    throw e;
  }
  if (act === "reject") {
    const n = note != null ? String(note).trim() : "";
    if (!n) {
      const e = new Error("กรุณากรอกหมายเหตุเมื่อยกเลิกการถอน");
      e.code = "VALIDATION";
      throw e;
    }
  }
  const nextStatus = act === "approve" ? "approved" : "rejected";
  const r = await pool.query(`SELECT * FROM central_prize_withdrawal_requests WHERE id = $1::uuid`, [
    withdrawalId
  ]);
  if (r.rows.length === 0) {
    const e = new Error("ไม่พบคำขอ");
    e.code = "NOT_FOUND";
    throw e;
  }
  if (String(r.rows[0].status) !== "pending") {
    const e = new Error("คำขอนี้ดำเนินการแล้ว");
    e.code = "VALIDATION";
    throw e;
  }
  const noteTrim = note != null ? String(note).trim().slice(0, 500) : "";
  const slipTrim =
    transferSlipUrl != null && act === "approve" ? String(transferSlipUrl).trim().slice(0, 800) : "";
  const up = await pool.query(
    `UPDATE central_prize_withdrawal_requests
     SET status = $2,
         creator_note = CASE WHEN $3 = '' THEN creator_note ELSE $3 END,
         resolved_at = NOW(),
         transfer_slip_url = CASE
           WHEN $2 = 'approved' AND $4 <> '' THEN $4
           ELSE transfer_slip_url
         END
     WHERE id = $1::uuid AND status = 'pending'
     RETURNING *`,
    [withdrawalId, nextStatus, noteTrim, slipTrim]
  );
  if (up.rows.length === 0) {
    const e = new Error("อัปเดตไม่สำเร็จ");
    e.code = "CONFLICT";
    throw e;
  }
  return mapRow(up.rows[0]);
}

module.exports = {
  getAvailability,
  createRequest,
  listForRequester,
  listIncomingForCreator,
  countGamesCreatedBy,
  cancelByRequester,
  resolveByCreator,
  parseCashBahtFromAward,
  listPendingWithdrawalsForAdmin,
  listAllWithdrawalsForAdmin,
  withdrawalReserveTotalsByRequester,
  resolveByAdmin
};
