const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { getPool } = require("../db/pool");
const userStore = require("../userStore");
const { MEMBER, ADMIN, OWNER } = require("../constants/roles");
const heartLedgerService = require("./heartLedgerService");
const phoneHistoryService = require("./phoneHistoryService");
const {
  emptyParts,
  formatShippingLines,
  partsFromRow,
  dbValuesFromParts,
  KEYS,
  MAX_FIELD,
  MAX_POSTAL
} = require("../shippingAddress");
const { validateUsername, validateEmail } = require("../authValidators");

function sanitizeLinePictureUrl(v) {
  if (v == null) return null;
  const s = String(v).trim().slice(0, 1024);
  if (!/^https:\/\//i.test(s)) return null;
  return s;
}

/** ลิงก์ https เท่านั้น — ว่างเป็น null */
function sanitizeHttpsUrlOptional(v, maxLen) {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  if (!/^https:\/\//i.test(s)) return null;
  return s.slice(0, maxLen);
}

/** ชื่อหัวข้อเพจสาธารณะ — ว่างเป็น null */
function sanitizePublicPageTitle(v) {
  if (v == null) return null;
  const s = String(v).replace(/\u0000/g, "").trim().slice(0, 120);
  return s === "" ? null : s;
}

function normalizeBirthDate(v) {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s || null;
}

/** เบอร์ใน DB — ว่างเป็น null (ไม่ใช่ placeholder จาก LINE) */
function normPhone(p) {
  if (p == null) return null;
  const s = String(p).replace(/\s+/g, "").trim();
  return s === "" ? null : s.slice(0, 16);
}

/** รหัส 6 หลัก: ตัวอักษร 2 หรือ 3 ตัวหน้า (ไม่มี o) + ตัวเลข 1–9 ท้าย (ไม่มี 0) — จำง่าย */
const MEMBER_CODE_LETTERS = "abcdefghijklmnpqrstuvwxyz";
const MEMBER_CODE_DIGITS = "123456789";

function randomMemberLoginCode6() {
  const buf = crypto.randomBytes(8);
  const threeLetters = buf[0] % 2 === 0;
  let s = "";
  if (threeLetters) {
    for (let i = 0; i < 3; i++) {
      s += MEMBER_CODE_LETTERS[buf[1 + i] % MEMBER_CODE_LETTERS.length];
    }
    for (let i = 0; i < 3; i++) {
      s += MEMBER_CODE_DIGITS[buf[4 + i] % MEMBER_CODE_DIGITS.length];
    }
  } else {
    for (let i = 0; i < 2; i++) {
      s += MEMBER_CODE_LETTERS[buf[1 + i] % MEMBER_CODE_LETTERS.length];
    }
    for (let i = 0; i < 4; i++) {
      s += MEMBER_CODE_DIGITS[buf[3 + i] % MEMBER_CODE_DIGITS.length];
    }
  }
  return s;
}

function rowToUser(row) {
  const pink =
    row.pink_hearts_balance == null
      ? Math.max(0, Math.floor(Number(row.hearts_balance) || 0))
      : Math.max(0, Math.floor(Number(row.pink_hearts_balance) || 0));
  const red =
    row.red_hearts_balance == null
      ? 0
      : Math.max(0, Math.floor(Number(row.red_hearts_balance) || 0));
  const giveaway =
    row.red_giveaway_balance == null
      ? 0
      : Math.max(0, Math.floor(Number(row.red_giveaway_balance) || 0));
  const sum = pink + red + giveaway;
  const parts = partsFromRow(row);
  const line =
    (row.shipping_address && String(row.shipping_address).trim()) ||
    formatShippingLines(parts) ||
    null;
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    countryCode: row.country_code || "TH",
    registrationIp: row.registration_ip || null,
    gender: row.gender || null,
    birthDate: normalizeBirthDate(row.birth_date),
    shippingAddress: line,
    shippingAddressParts: parts,
    role: row.role || MEMBER,
    pinkHeartsBalance: pink,
    redHeartsBalance: red,
    redGiveawayBalance: giveaway,
    heartsBalance: sum,
    accountDisabled: Boolean(row.account_disabled),
    createdAt: row.created_at,
    prizeContactLine:
      row.prize_contact_line != null && String(row.prize_contact_line).trim()
        ? String(row.prize_contact_line).trim().slice(0, 500)
        : null,
    lineUserId:
      row.line_user_id != null && String(row.line_user_id).trim()
        ? String(row.line_user_id).trim()
        : null,
    linePictureUrl: sanitizeLinePictureUrl(row.line_picture_url),
    profilePictureUrl: sanitizeHttpsUrlOptional(row.profile_picture_url, 1024),
    socialFacebookUrl: sanitizeHttpsUrlOptional(row.social_facebook_url, 500),
    socialLineUrl: sanitizeHttpsUrlOptional(row.social_line_url, 500),
    socialTiktokUrl: sanitizeHttpsUrlOptional(row.social_tiktok_url, 500),
    publicPageCoverUrl: sanitizeHttpsUrlOptional(row.public_page_cover_url, 1024),
    publicPageBio:
      row.public_page_bio != null && String(row.public_page_bio).trim()
        ? String(row.public_page_bio).trim().slice(0, 2000)
        : null,
    publicPageTitle: sanitizePublicPageTitle(row.public_page_title),
    publicPageListed: row.public_page_listed === false ? false : true,
    email:
      row.email != null && String(row.email).trim()
        ? String(row.email).trim().toLowerCase().slice(0, 254)
        : null,
    selfServiceNameEdits: Math.max(
      0,
      Math.floor(Number(row.self_service_name_edits) || 0)
    )
  };
}

async function findByUsername(username) {
  const pool = getPool();
  const un = String(username || "").toLowerCase();
  if (!pool) {
    return enrichFileUserShipping(userStore.findByUsername(un));
  }
  const r = await pool.query("SELECT * FROM users WHERE username = $1", [un]);
  if (r.rows.length === 0) return null;
  return rowToUser(r.rows[0]);
}

function enrichFileUserShipping(u) {
  if (!u) return null;
  let parts = emptyParts();
  if (u.shippingAddressParts && typeof u.shippingAddressParts === "object") {
    for (const k of KEYS) {
      const max = k === "postalCode" ? MAX_POSTAL : MAX_FIELD;
      parts[k] = String(u.shippingAddressParts[k] || "")
        .trim()
        .slice(0, max);
    }
    const anyStructured = KEYS.some((key) => parts[key].length > 0);
    if (!anyStructured && u.shippingAddress) {
      parts = { ...emptyParts(), houseNo: String(u.shippingAddress).trim() };
    }
  } else if (u.shippingAddress) {
    parts = { ...emptyParts(), houseNo: String(u.shippingAddress).trim() };
  }
  const line =
    (u.shippingAddress && String(u.shippingAddress).trim()) ||
    formatShippingLines(parts) ||
    null;
  return {
    ...u,
    shippingAddress: line,
    shippingAddressParts: parts,
    prizeContactLine:
      u.prizeContactLine != null && String(u.prizeContactLine).trim()
        ? String(u.prizeContactLine).trim().slice(0, 500)
        : null,
    email:
      u.email != null && String(u.email).trim()
        ? String(u.email).trim().toLowerCase()
        : null,
    selfServiceNameEdits: Math.max(
      0,
      Math.floor(Number(u.selfServiceNameEdits) || 0)
    ),
    profilePictureUrl: sanitizeHttpsUrlOptional(u.profilePictureUrl, 1024),
    socialFacebookUrl: sanitizeHttpsUrlOptional(u.socialFacebookUrl, 500),
    socialLineUrl: sanitizeHttpsUrlOptional(u.socialLineUrl, 500),
    socialTiktokUrl: sanitizeHttpsUrlOptional(u.socialTiktokUrl, 500),
    publicPageCoverUrl: sanitizeHttpsUrlOptional(u.publicPageCoverUrl, 1024),
    publicPageBio:
      u.publicPageBio != null && String(u.publicPageBio).trim()
        ? String(u.publicPageBio).trim().slice(0, 2000)
        : null,
    publicPageTitle: sanitizePublicPageTitle(u.publicPageTitle),
    publicPageListed: u.publicPageListed === false ? false : true
  };
}

function publicDirectoryDisplayName(u) {
  const fn = String(u.firstName || "").trim();
  const ln = String(u.lastName || "").trim();
  const joined = [fn, ln].filter(Boolean).join(" ").trim();
  return joined || String(u.username || "").trim();
}

function publicDirectoryAvatarUrl(u) {
  const p = u.profilePictureUrl;
  const l = u.linePictureUrl;
  const a = (p && String(p).trim()) || (l && String(l).trim()) || "";
  return a || null;
}

/**
 * รายชื่อเพจสมาชิกสำหรับหน้าแรก/ชุมชน — ไม่รวมแอดมินและบัญชีปิด
 */
async function listPublicMemberDirectory(limit = 12) {
  const lim = Math.min(48, Math.max(1, Math.floor(Number(limit) || 12)));
  const pool = getPool();
  if (!pool) {
    const rows = userStore.listForAdmin({ q: "", limit: 200, offset: 0 });
    return rows
      .filter((u) => !u.accountDisabled && String(u.role || MEMBER) !== ADMIN)
      .filter((u) => u.publicPageListed !== false)
      .slice(0, lim)
      .map((raw) => {
        const u = enrichFileUserShipping(raw);
        return {
          username: u.username,
          pageTitle: sanitizePublicPageTitle(u.publicPageTitle),
          displayName: publicDirectoryDisplayName(u),
          profilePictureUrl: publicDirectoryAvatarUrl(u),
          publicPageCoverUrl: u.publicPageCoverUrl || null,
          publicPageBio: u.publicPageBio || null
        };
      });
  }
  const r = await pool.query(
    `SELECT username, first_name, last_name,
            profile_picture_url, line_picture_url,
            public_page_cover_url, public_page_bio, public_page_title
     FROM users
     WHERE account_disabled = false
       AND COALESCE(role, 'member') <> 'admin'
       AND COALESCE(public_page_listed, true) = true
     ORDER BY created_at DESC NULLS LAST
     LIMIT $1`,
    [lim]
  );
  return r.rows.map((row) => {
    const u = rowToUser(row);
    return {
      username: u.username,
      pageTitle: sanitizePublicPageTitle(u.publicPageTitle),
      displayName: publicDirectoryDisplayName(u),
      profilePictureUrl: publicDirectoryAvatarUrl(u),
      publicPageCoverUrl: u.publicPageCoverUrl || null,
      publicPageBio: u.publicPageBio || null
    };
  });
}

async function findById(id) {
  const pool = getPool();
  if (!pool) {
    return enrichFileUserShipping(userStore.findById(id));
  }
  const r = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  if (r.rows.length === 0) return null;
  return rowToUser(r.rows[0]);
}

async function findByPhone(phone) {
  const p = String(phone ?? "").trim();
  if (!p) return null;
  const pool = getPool();
  if (!pool) {
    return enrichFileUserShipping(userStore.findByPhone(p));
  }
  const r = await pool.query("SELECT * FROM users WHERE phone = $1 LIMIT 1", [
    p
  ]);
  if (r.rows.length === 0) return null;
  return rowToUser(r.rows[0]);
}

async function findByEmail(email) {
  const e = String(email ?? "").trim().toLowerCase();
  if (!e) return null;
  const pool = getPool();
  if (!pool) {
    return enrichFileUserShipping(userStore.findByEmail(e));
  }
  const r = await pool.query(
    `SELECT * FROM users WHERE LOWER(TRIM(COALESCE(email,''))) = $1 LIMIT 1`,
    [e]
  );
  if (r.rows.length === 0) return null;
  return rowToUser(r.rows[0]);
}

/** หาผู้ใช้ที่ชื่อและนามสกุลตรงกันทั้งคู่เท่านั้น (ไม่ถือว่าซ้ำถ้าตรงแค่อย่างใดอย่างหนึ่ง) */
async function findByLineUserId(lineUserId) {
  const lid = String(lineUserId || "").trim();
  if (!lid) return null;
  const pool = getPool();
  if (!pool) return null;
  const r = await pool.query(
    "SELECT * FROM users WHERE line_user_id = $1 LIMIT 1",
    [lid]
  );
  if (r.rows.length === 0) return null;
  return rowToUser(r.rows[0]);
}

/**
 * สร้างสมาชิกจาก LINE Login — ต้องมี PostgreSQL
 * @param {{ lineUserId: string, displayName?: string, registrationIp?: string|null, pictureUrl?: string|null }} opts
 */
async function createUserFromLine({
  lineUserId,
  displayName,
  registrationIp = null,
  pictureUrl = null
}) {
  const pool = getPool();
  if (!pool) {
    const err = new Error("ต้องใช้ PostgreSQL เพื่อล็อกอินด้วย LINE");
    err.code = "DB_REQUIRED";
    throw err;
  }
  const lid = String(lineUserId || "").trim();
  if (!/^U[A-Za-z0-9._-]{4,128}$/.test(lid)) {
    const err = new Error("รูปแบบ LINE user id ไม่ถูกต้อง");
    err.code = "INVALID_LINE_USER";
    throw err;
  }

  const existing = await findByLineUserId(lid);
  if (existing) return existing;

  const dn = String(displayName || "").trim().slice(0, 100) || "สมาชิก LINE";
  const parts = dn.split(/\s+/).filter(Boolean);
  let firstName = (parts[0] || "สมาชิก").slice(0, 64);
  let lastName = (parts.slice(1).join(" ") || "LINE").slice(0, 64);

  const phone = null;
  const ip =
    registrationIp == null ? null : String(registrationIp).slice(0, 64);

  let username = null;
  let passwordHash = null;
  for (let attempt = 0; attempt < 32; attempt++) {
    const loginCode = randomMemberLoginCode6();
    const clash = await pool.query("SELECT 1 FROM users WHERE username = $1", [
      loginCode
    ]);
    if (clash.rows.length === 0) {
      username = loginCode;
      passwordHash = bcrypt.hashSync(loginCode, 10);
      break;
    }
  }
  if (!username || !passwordHash) {
    const err = new Error("สร้างรหัสเข้าระบบไม่สำเร็จ ลองใหม่");
    err.code = "USERNAME_GEN_FAILED";
    throw err;
  }

  const id = crypto.randomUUID();
  const linePic = sanitizeLinePictureUrl(pictureUrl);
  try {
    const r = await pool.query(
      `INSERT INTO users (id, username, password_hash, first_name, last_name, phone, country_code, registration_ip, role, line_user_id, line_picture_url)
       VALUES ($1, $2, $3, $4, $5, $6, 'TH', $7, $8, $9, $10)
       RETURNING *`,
      [id, username, passwordHash, firstName, lastName, phone, ip, MEMBER, lid, linePic]
    );
    return rowToUser(r.rows[0]);
  } catch (e) {
    if (e.code === "23505") {
      const again = await findByLineUserId(lid);
      if (again) return again;
    }
    throw e;
  }
}

async function syncLinePictureFromLine(userId, pictureUrl) {
  const pool = getPool();
  const url = sanitizeLinePictureUrl(pictureUrl);
  if (!pool || !url) return null;
  const r = await pool.query(
    `UPDATE users SET line_picture_url = $2 WHERE id = $1 RETURNING *`,
    [String(userId), url]
  );
  if (r.rows.length === 0) return null;
  return rowToUser(r.rows[0]);
}

async function findByThaiFullName(firstName, lastName) {
  const fn = String(firstName ?? "").trim();
  const ln = String(lastName ?? "").trim();
  if (!fn || !ln) return null;
  const pool = getPool();
  if (!pool) {
    return enrichFileUserShipping(userStore.findByThaiFullName(fn, ln));
  }
  const r = await pool.query(
    "SELECT * FROM users WHERE first_name = $1 AND last_name = $2 LIMIT 1",
    [fn, ln]
  );
  if (r.rows.length === 0) return null;
  return rowToUser(r.rows[0]);
}

async function createUser({
  username,
  passwordHash,
  firstName,
  lastName,
  phone,
  countryCode = "TH",
  registrationIp = null,
  role = MEMBER
}) {
  const pool = getPool();
  const un = String(username).toLowerCase();
  const cc = String(countryCode || "TH").toUpperCase().slice(0, 8);
  const ip =
    registrationIp == null
      ? null
      : String(registrationIp).slice(0, 64);
  const rle = role || MEMBER;
  if (!pool) {
    return userStore.createUser({
      username: un,
      passwordHash,
      firstName,
      lastName,
      phone,
      countryCode: cc,
      registrationIp: ip,
      role: rle
    });
  }

  const existingPhone = await findByPhone(phone);
  if (existingPhone) {
    const err = new Error("PHONE_TAKEN");
    err.code = "PHONE_TAKEN";
    throw err;
  }

  const id = crypto.randomUUID();
  try {
    const r = await pool.query(
      `INSERT INTO users (id, username, password_hash, first_name, last_name, phone, country_code, registration_ip, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, un, passwordHash, firstName, lastName, phone, cc, ip, rle]
    );
    return rowToUser(r.rows[0]);
  } catch (e) {
    if (e.code === "23505") {
      const d = String(e.detail || "").toLowerCase();
      if (d.includes("(phone)")) {
        const pe = new Error("PHONE_TAKEN");
        pe.code = "PHONE_TAKEN";
        throw pe;
      }
      const ue = new Error("USERNAME_TAKEN");
      ue.code = "USERNAME_TAKEN";
      throw ue;
    }
    throw e;
  }
}

function publicUser(u) {
  if (!u) return null;
  const p =
    u.pinkHeartsBalance == null
      ? Math.max(0, Math.floor(Number(u.heartsBalance) || 0))
      : Math.max(0, Math.floor(Number(u.pinkHeartsBalance) || 0));
  const r =
    u.redHeartsBalance == null
      ? 0
      : Math.max(0, Math.floor(Number(u.redHeartsBalance) || 0));
  const g =
    u.redGiveawayBalance == null
      ? 0
      : Math.max(0, Math.floor(Number(u.redGiveawayBalance) || 0));
  const blocked = Boolean(u.accountDisabled);
  let createdAt = null;
  if (u.createdAt != null) {
    createdAt =
      u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt);
  }
  return {
    id: u.id,
    username: u.username,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    countryCode: u.countryCode || "TH",
    gender: u.gender ?? null,
    birthDate: u.birthDate ?? null,
    shippingAddress: u.shippingAddress ?? null,
    shippingAddressParts:
      u.shippingAddressParts && typeof u.shippingAddressParts === "object"
        ? { ...emptyParts(), ...u.shippingAddressParts }
        : emptyParts(),
    role: u.role || MEMBER,
    pinkHeartsBalance: p,
    redHeartsBalance: r,
    redGiveawayBalance: g,
    heartsBalance: p + r + g,
    accountDisabled: blocked,
    createdAt,
    prizeContactLine:
      u.prizeContactLine != null && String(u.prizeContactLine).trim()
        ? String(u.prizeContactLine).trim()
        : null,
    email:
      u.email != null && String(u.email).trim() ? String(u.email).trim() : null,
    selfServiceNameEditsUsed: Math.max(
      0,
      Math.floor(Number(u.selfServiceNameEdits) || 0)
    ),
    selfServiceNameEditsRemaining: Math.max(
      0,
      3 - Math.floor(Number(u.selfServiceNameEdits) || 0)
    ),
    linePictureUrl: sanitizeLinePictureUrl(u.linePictureUrl),
    profilePictureUrl: sanitizeHttpsUrlOptional(u.profilePictureUrl, 1024),
    socialFacebookUrl: sanitizeHttpsUrlOptional(u.socialFacebookUrl, 500),
    socialLineUrl: sanitizeHttpsUrlOptional(u.socialLineUrl, 500),
    socialTiktokUrl: sanitizeHttpsUrlOptional(u.socialTiktokUrl, 500),
    lineLoginLinked: Boolean(
      u.lineUserId != null && String(u.lineUserId).trim() !== ""
    ),
    publicPageCoverUrl: sanitizeHttpsUrlOptional(u.publicPageCoverUrl, 1024),
    publicPageBio:
      u.publicPageBio != null && String(u.publicPageBio).trim()
        ? String(u.publicPageBio).trim().slice(0, 2000)
        : null,
    publicPageTitle: sanitizePublicPageTitle(u.publicPageTitle),
    publicPageListed: u.publicPageListed === false ? false : true
  };
}

async function syncPrizeContactLineToDb(pool, userId, updatePrizeContactLine, prizeContactLine) {
  if (!pool || !updatePrizeContactLine) return;
  const v =
    prizeContactLine != null && String(prizeContactLine).trim()
      ? String(prizeContactLine).trim().slice(0, 500)
      : null;
  await pool.query(`UPDATE users SET prize_contact_line = $2 WHERE id = $1::uuid`, [
    userId,
    v
  ]);
}

async function updateProfile(
  userId,
  {
    gender,
    updateGender,
    birthDate,
    updateBirthDate,
    shippingParts,
    updateShipping,
    phone,
    updatePhone,
    prizeContactLine,
    updatePrizeContactLine,
    firstName,
    lastName,
    updateNames,
    username,
    updateUsername,
    email,
    updateEmail,
    profilePictureUrl,
    updateProfilePicture,
    socialFacebookUrl,
    updateSocialFacebook,
    socialLineUrl,
    updateSocialLine,
    socialTiktokUrl,
    updateSocialTiktok,
    publicPageCoverUrl,
    updatePublicPageCover,
    publicPageBio,
    updatePublicPageBio,
    publicPageTitle,
    updatePublicPageTitle,
    publicPageListed,
    updatePublicPageListed
  },
  opts = {}
) {
  const clientIp = opts.clientIp ?? null;
  const current = await findById(userId);
  if (!current) return null;

  const nextGender = updateGender ? gender : current.gender ?? null;
  const nextBirthDate = updateBirthDate
    ? birthDate || null
    : current.birthDate ?? null;

  const nextFirst = updateNames ? firstName : current.firstName;
  const nextLast = updateNames ? lastName : current.lastName;
  const namesChanging =
    Boolean(updateNames) &&
    (String(nextFirst) !== String(current.firstName || "") ||
      String(nextLast) !== String(current.lastName || ""));
  if (namesChanging && (current.selfServiceNameEdits || 0) >= 3) {
    const err = new Error(
      "แก้ชื่อ–นามสกุลเองได้ครบ 3 ครั้งแล้ว — ใช้คำขอแอดมินด้านล่าง"
    );
    err.code = "NAME_EDIT_LIMIT";
    throw err;
  }
  const nameEditDelta = namesChanging ? 1 : 0;

  let nextUsername = String(current.username || "").toLowerCase();
  if (updateUsername) {
    nextUsername = String(username).toLowerCase();
    if (nextUsername !== String(current.username || "").toLowerCase()) {
      const taken = await findByUsername(nextUsername);
      if (taken && String(taken.id) !== String(userId)) {
        const e = new Error("ชื่อผู้ใช้นี้ถูกใช้แล้ว");
        e.code = "USERNAME_TAKEN";
        throw e;
      }
    }
  }

  let nextEmail =
    current.email != null && String(current.email).trim()
      ? String(current.email).trim().toLowerCase()
      : null;
  if (updateEmail) {
    nextEmail = email;
    if (nextEmail != null) {
      const taken = await findByEmail(nextEmail);
      if (taken && String(taken.id) !== String(userId)) {
        const e = new Error("อีเมลนี้ถูกใช้แล้ว");
        e.code = "EMAIL_TAKEN";
        throw e;
      }
    }
  }

  const oldPhone = normPhone(current.phone);
  const newPhone = updatePhone ? normPhone(phone) : oldPhone;
  const phoneChanged = Boolean(updatePhone) && newPhone !== oldPhone;
  if (phoneChanged && newPhone != null) {
    const taken = await findByPhone(newPhone);
    if (taken && taken.id !== userId) {
      const err = new Error("PHONE_TAKEN");
      err.code = "PHONE_TAKEN";
      throw err;
    }
  }

  const baseShipParts = {
    ...emptyParts(),
    ...(current.shippingAddressParts && typeof current.shippingAddressParts === "object"
      ? current.shippingAddressParts
      : {})
  };
  const mergedShipParts =
    updateShipping && shippingParts
      ? { ...baseShipParts, ...shippingParts }
      : baseShipParts;
  const shipDb = dbValuesFromParts(mergedShipParts);

  let nextProfilePictureUrl = sanitizeHttpsUrlOptional(
    current.profilePictureUrl,
    1024
  );
  if (updateProfilePicture) nextProfilePictureUrl = profilePictureUrl;

  let nextSocialFacebook = sanitizeHttpsUrlOptional(
    current.socialFacebookUrl,
    500
  );
  if (updateSocialFacebook) nextSocialFacebook = socialFacebookUrl;

  let nextSocialLine = sanitizeHttpsUrlOptional(current.socialLineUrl, 500);
  if (updateSocialLine) nextSocialLine = socialLineUrl;

  let nextSocialTiktok = sanitizeHttpsUrlOptional(
    current.socialTiktokUrl,
    500
  );
  if (updateSocialTiktok) nextSocialTiktok = socialTiktokUrl;

  let nextPublicPageCover = sanitizeHttpsUrlOptional(
    current.publicPageCoverUrl,
    1024
  );
  if (updatePublicPageCover) nextPublicPageCover = publicPageCoverUrl;

  let nextPublicPageBio =
    current.publicPageBio != null && String(current.publicPageBio).trim()
      ? String(current.publicPageBio).trim().slice(0, 2000)
      : null;
  if (updatePublicPageBio) {
    nextPublicPageBio =
      publicPageBio != null && String(publicPageBio).trim()
        ? String(publicPageBio).trim().slice(0, 2000)
        : null;
  }

  let nextPublicPageTitle = sanitizePublicPageTitle(current.publicPageTitle);
  if (updatePublicPageTitle) {
    nextPublicPageTitle = sanitizePublicPageTitle(publicPageTitle);
  }

  let nextPublicPageListed =
    current.publicPageListed === false ? false : true;
  if (updatePublicPageListed) {
    nextPublicPageListed = Boolean(publicPageListed);
  }

  const pool = getPool();

  if (!pool) {
    const patch = {
      gender: nextGender,
      birthDate: nextBirthDate,
      firstName: nextFirst,
      lastName: nextLast,
      username: nextUsername,
      email: nextEmail,
      selfServiceNameEdits:
        (current.selfServiceNameEdits || 0) + nameEditDelta,
      profilePictureUrl: nextProfilePictureUrl,
      socialFacebookUrl: nextSocialFacebook,
      socialLineUrl: nextSocialLine,
      socialTiktokUrl: nextSocialTiktok,
      publicPageCoverUrl: nextPublicPageCover,
      publicPageBio: nextPublicPageBio,
      publicPageTitle: nextPublicPageTitle,
      publicPageListed: nextPublicPageListed
    };
    patch.shippingAddress = shipDb.shipping_address;
    patch.shippingAddressParts = { ...mergedShipParts };
    if (phoneChanged) {
      const phoneHistory = Array.isArray(current.phoneHistory)
        ? [...current.phoneHistory]
        : [];
      phoneHistory.push({
        oldPhone: oldPhone ?? "",
        newPhone: newPhone ?? "",
        changedAt: new Date().toISOString(),
        clientIp:
          clientIp == null ? null : String(clientIp).slice(0, 64)
      });
      patch.phone = newPhone;
      patch.phoneHistory = phoneHistory;
    }
    if (updatePrizeContactLine) {
      patch.prizeContactLine = prizeContactLine;
    }
    userStore.updateUser(userId, patch);
    return findById(userId);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (phoneChanged) {
      await phoneHistoryService.insertWithClient(client, {
        userId,
        oldPhone,
        newPhone,
        clientIp
      });
    }
    await client.query(
      `UPDATE users SET
        gender = $2,
        birth_date = $3,
        first_name = $4,
        last_name = $5,
        username = $6,
        email = $7,
        phone = $8,
        shipping_address = $9,
        shipping_house_no = $10,
        shipping_moo = $11,
        shipping_road = $12,
        shipping_subdistrict = $13,
        shipping_district = $14,
        shipping_province = $15,
        shipping_postal_code = $16,
        profile_picture_url = $17,
        social_facebook_url = $18,
        social_line_url = $19,
        social_tiktok_url = $20,
        self_service_name_edits = self_service_name_edits + $21,
        public_page_cover_url = $22,
        public_page_bio = $23,
        public_page_title = $24,
        public_page_listed = $25
      WHERE id = $1::uuid`,
      [
        userId,
        nextGender,
        nextBirthDate || null,
        nextFirst,
        nextLast,
        nextUsername,
        nextEmail,
        newPhone,
        shipDb.shipping_address,
        shipDb.shipping_house_no,
        shipDb.shipping_moo,
        shipDb.shipping_road,
        shipDb.shipping_subdistrict,
        shipDb.shipping_district,
        shipDb.shipping_province,
        shipDb.shipping_postal_code,
        nextProfilePictureUrl,
        nextSocialFacebook,
        nextSocialLine,
        nextSocialTiktok,
        nameEditDelta,
        nextPublicPageCover,
        nextPublicPageBio,
        nextPublicPageTitle,
        nextPublicPageListed
      ]
    );
    await client.query("COMMIT");
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    if (e.code === "23505") {
      const d = String(e.detail || "").toLowerCase();
      if (d.includes("(phone)")) {
        const pe = new Error("PHONE_TAKEN");
        pe.code = "PHONE_TAKEN";
        throw pe;
      }
      if (d.includes("(username)")) {
        const ue = new Error("ชื่อผู้ใช้นี้ถูกใช้แล้ว");
        ue.code = "USERNAME_TAKEN";
        throw ue;
      }
      if (d.includes("email")) {
        const ee = new Error("อีเมลนี้ถูกใช้แล้ว");
        ee.code = "EMAIL_TAKEN";
        throw ee;
      }
    }
    throw e;
  } finally {
    client.release();
  }
  await syncPrizeContactLineToDb(pool, userId, updatePrizeContactLine, prizeContactLine);
  return findById(userId);
}

async function setPasswordAndRole(userId, passwordHash, role = ADMIN) {
  const pool = getPool();
  if (!pool) {
    userStore.updateUser(userId, { passwordHash, role });
    return findById(userId);
  }
  await pool.query(
    `UPDATE users SET password_hash = $2, role = $3 WHERE id = $1`,
    [userId, passwordHash, role]
  );
  return findById(userId);
}

async function setPasswordHashOnly(userId, passwordHash) {
  const pool = getPool();
  if (!pool) {
    userStore.updateUser(userId, { passwordHash });
    return findById(userId);
  }
  await pool.query(
    `UPDATE users SET password_hash = $2 WHERE id = $1`,
    [userId, passwordHash]
  );
  return findById(userId);
}

/**
 * บวก/ลบหัวใจชมพู+แดง (ยอดแต่ละประเภทไม่ต่ำกว่า 0)
 * @param {{ kind?: string; label?: string; meta?: Record<string, unknown> } | null} ledgerOpts — บันทึก heart_ledger เมื่อมี DB
 */
async function adjustDualHearts(userId, pinkDelta = 0, redDelta = 0, ledgerOpts = null) {
  const pd = Math.floor(Number(pinkDelta) || 0);
  const rd = Math.floor(Number(redDelta) || 0);
  if (pd === 0 && rd === 0) return findById(userId);
  const pool = getPool();
  if (!pool) {
    const u = userStore.findById(userId);
    if (!u) return null;
    const p = Math.max(
      0,
      Math.floor(Number(u.pinkHeartsBalance ?? u.heartsBalance) || 0) + pd
    );
    const r = Math.max(0, Math.floor(Number(u.redHeartsBalance) || 0) + rd);
    const g = Math.max(0, Math.floor(Number(u.redGiveawayBalance) || 0));
    userStore.updateUser(userId, {
      pinkHeartsBalance: p,
      redHeartsBalance: r,
      heartsBalance: p + r + g
    });
    return findById(userId);
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await adjustDualHeartsWithClient(client, userId, pd, rd, ledgerOpts);
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
  return findById(userId);
}

/**
 * ปรับหัวใจชมพู/แดงภายใน transaction ที่ caller เปิด BEGIN แล้ว
 * @returns {{ pinkAfter: number, redAfter: number }}
 */
async function adjustDualHeartsWithClient(client, userId, pinkDelta = 0, redDelta = 0, ledgerOpts = null) {
  const pd = Math.floor(Number(pinkDelta) || 0);
  const rd = Math.floor(Number(redDelta) || 0);
  if (pd === 0 && rd === 0) {
    return { pinkAfter: 0, redAfter: 0 };
  }
  const upd = await client.query(
    `UPDATE users SET
      pink_hearts_balance = GREATEST(0, COALESCE(pink_hearts_balance, 0) + $2),
      red_hearts_balance = GREATEST(0, COALESCE(red_hearts_balance, 0) + $3),
      hearts_balance =
        GREATEST(0, COALESCE(pink_hearts_balance, 0) + $2) +
        GREATEST(0, COALESCE(red_hearts_balance, 0) + $3) +
        COALESCE(red_giveaway_balance, 0)
    WHERE id = $1
    RETURNING pink_hearts_balance, red_hearts_balance`,
    [userId, pd, rd]
  );
  if (upd.rows.length === 0) {
    const e = new Error("ไม่พบบัญชี");
    e.code = "NOT_FOUND";
    throw e;
  }
  const bal = upd.rows[0];
  const pAfter = Math.max(0, Math.floor(Number(bal.pink_hearts_balance) || 0));
  const rAfter = Math.max(0, Math.floor(Number(bal.red_hearts_balance) || 0));
  const kind = ledgerOpts?.kind || "adjustment";
  const label =
    ledgerOpts?.label ||
    (pd < 0 || rd < 0 ? "หัก / ปรับลดหัวใจ" : "ได้รับ / เพิ่มหัวใจ");
  await heartLedgerService.insertWithClient(client, {
    userId,
    pinkDelta: pd,
    redDelta: rd,
    pinkAfter: pAfter,
    redAfter: rAfter,
    kind,
    label,
    meta: ledgerOpts?.meta ?? null
  });
  return { pinkAfter: pAfter, redAfter: rAfter };
}

/** ความเข้ากันได้เดิม: ปรับเฉพาะหัวใจชมพู */
async function adjustHeartsBalance(userId, delta) {
  return adjustDualHearts(userId, delta, 0);
}

async function updateOfficialNames(userId, firstName, lastName) {
  const pool = getPool();
  if (!pool) {
    userStore.updateUser(userId, { firstName, lastName });
    return findById(userId);
  }
  await pool.query(
    `UPDATE users SET first_name = $2, last_name = $3 WHERE id = $1`,
    [userId, firstName, lastName]
  );
  return findById(userId);
}

function createdAtIso(u) {
  if (!u || u.createdAt == null) return null;
  const ca = u.createdAt;
  return ca instanceof Date ? ca.toISOString() : String(ca);
}

/** รายการสมาชิกในหลังบ้านแอดมิน (ไม่มีรหัสผ่าน) */
function adminMemberListItem(u) {
  if (!u) return null;
  const p = Math.max(0, Math.floor(Number(u.pinkHeartsBalance) || 0));
  const r = Math.max(0, Math.floor(Number(u.redHeartsBalance) || 0));
  const g = Math.max(0, Math.floor(Number(u.redGiveawayBalance) || 0));
  const room = Math.max(0, Math.floor(Number(u.roomGiftRedTotal) || 0));
  return {
    id: u.id,
    username: u.username,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    countryCode: u.countryCode || "TH",
    role: u.role || MEMBER,
    gender: u.gender ?? null,
    birthDate: u.birthDate ?? null,
    pinkHeartsBalance: p,
    redHeartsBalance: r,
    roomGiftRedTotal: room,
    redHeartsDisplay: r + room,
    redGiveawayBalance: g,
    heartsBalance: p + r + g,
    accountDisabled: Boolean(u.accountDisabled),
    createdAt: createdAtIso(u),
    email:
      u.email != null && String(u.email).trim() ? String(u.email).trim() : null,
    selfServiceNameEditsUsed: Math.max(
      0,
      Math.floor(Number(u.selfServiceNameEdits) || 0)
    )
  };
}

/** รายละเอียดเต็มสำหรับแอดมิน */
function adminMemberDetail(u) {
  if (!u) return null;
  const parts =
    u.shippingAddressParts && typeof u.shippingAddressParts === "object"
      ? { ...emptyParts(), ...u.shippingAddressParts }
      : emptyParts();
  return {
    ...adminMemberListItem(u),
    shippingAddressParts: parts,
    shippingAddress: u.shippingAddress ?? null,
    registrationIp: u.registrationIp ?? null,
    passwordNote:
      "ยูสเซอร์ล็อกอินเห็นได้ด้านบน — รหัสผ่านเก็บเป็นแฮชเท่านั้น ไม่สามารถดูตัวอักษรเดิมได้ ตั้งรหัสใหม่ให้สมาชิกได้ด้านล่าง"
  };
}

/**
 * แอดมินปรับหัวใจชมพู + แดงเล่นได้ + แดงแจก (ครั้งเดียว + บันทึก ledger)
 */
async function adjustAdminTripleHearts(
  userId,
  pinkDelta = 0,
  redDelta = 0,
  giveawayDelta = 0,
  ledgerOpts = null
) {
  const pd = Math.floor(Number(pinkDelta) || 0);
  const rd = Math.floor(Number(redDelta) || 0);
  const gd = Math.floor(Number(giveawayDelta) || 0);
  if (pd === 0 && rd === 0 && gd === 0) return findById(userId);
  const pool = getPool();
  if (!pool) {
    const u = userStore.findById(userId);
    if (!u) return null;
    const p = Math.max(
      0,
      Math.floor(Number(u.pinkHeartsBalance ?? u.heartsBalance) || 0) + pd
    );
    const r = Math.max(0, Math.floor(Number(u.redHeartsBalance) || 0) + rd);
    const g = Math.max(0, Math.floor(Number(u.redGiveawayBalance) || 0) + gd);
    userStore.updateUser(userId, {
      pinkHeartsBalance: p,
      redHeartsBalance: r,
      redGiveawayBalance: g,
      heartsBalance: p + r + g
    });
    return findById(userId);
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const uRes = await client.query(
      `SELECT pink_hearts_balance, red_hearts_balance, COALESCE(red_giveaway_balance, 0) AS rg
       FROM users WHERE id = $1::uuid FOR UPDATE`,
      [userId]
    );
    if (uRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }
    const pinkHave = Math.max(0, Math.floor(Number(uRes.rows[0].pink_hearts_balance) || 0));
    const redHave = Math.max(0, Math.floor(Number(uRes.rows[0].red_hearts_balance) || 0));
    const giveHave = Math.max(0, Math.floor(Number(uRes.rows[0].rg) || 0));
    const newP = pinkHave + pd;
    const newR = redHave + rd;
    const newG = giveHave + gd;
    if (newP < 0 || newR < 0 || newG < 0) {
      await client.query("ROLLBACK");
      const e = new Error("ยอดหัวใจติดลบไม่ได้ — ลดเกินยอดคงเหลือ");
      e.code = "VALIDATION";
      throw e;
    }
    await client.query(
      `UPDATE users SET
        pink_hearts_balance = $2,
        red_hearts_balance = $3,
        red_giveaway_balance = $4,
        hearts_balance = $2::integer + $3::integer + $4::integer
       WHERE id = $1::uuid`,
      [userId, newP, newR, newG]
    );
    const kind = ledgerOpts?.kind || "admin_adjust";
    const label =
      ledgerOpts?.label ||
      (pd < 0 || rd < 0 || gd < 0 ? "แอดมินปรับลดหัวใจ" : "แอดมินเพิ่มหัวใจ");
    await heartLedgerService.insertWithClient(client, {
      userId,
      pinkDelta: pd,
      redDelta: rd,
      pinkAfter: newP,
      redAfter: newR,
      kind,
      label,
      meta: {
        ...(ledgerOpts?.meta && typeof ledgerOpts.meta === "object"
          ? ledgerOpts.meta
          : {}),
        redGiveawayDelta: gd,
        redGiveawayBalanceAfter: newG
      }
    });
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
  return findById(userId);
}

/**
 * แอดมินแก้โปรไฟล์สมาชิกโดยตรง (ไม่ผ่านคำขอเปลี่ยนชื่อ)
 */
async function adminPatchMember(userId, body = {}, opts = {}) {
  const clientIp = opts.clientIp ?? null;
  const b = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  if (Object.keys(b).length === 0) {
    return findById(userId);
  }
  const current = await findById(userId);
  if (!current) {
    const e = new Error("ไม่พบสมาชิก");
    e.code = "NOT_FOUND";
    throw e;
  }

  const has = (k) => Object.prototype.hasOwnProperty.call(b, k);

  let nextUsername = String(current.username || "").toLowerCase();
  if (has("username")) {
    const vu = validateUsername(b.username);
    if (!vu.ok) {
      const e = new Error(vu.error);
      e.code = "VALIDATION";
      throw e;
    }
    nextUsername = vu.value;
  }
  const usernameChanged =
    has("username") && nextUsername !== String(current.username || "").toLowerCase();
  if (usernameChanged) {
    const taken = await findByUsername(nextUsername);
    if (taken && String(taken.id) !== String(userId)) {
      const e = new Error("ชื่อผู้ใช้นี้ถูกใช้แล้ว");
      e.code = "USERNAME_TAKEN";
      throw e;
    }
  }

  const nextFirst = has("firstName")
    ? String(b.firstName ?? "").trim().slice(0, 64)
    : current.firstName;
  const nextLast = has("lastName")
    ? String(b.lastName ?? "").trim().slice(0, 64)
    : current.lastName;
  if (has("firstName") && nextFirst === "") {
    const e = new Error("ชื่อต้องไม่ว่าง");
    e.code = "VALIDATION";
    throw e;
  }
  if (has("lastName") && nextLast === "") {
    const e = new Error("นามสกุลต้องไม่ว่าง");
    e.code = "VALIDATION";
    throw e;
  }

  const oldPhoneNorm = normPhone(current.phone);
  const nextPhone = has("phone") ? normPhone(b.phone) : oldPhoneNorm;

  let nextEmail =
    current.email != null && String(current.email).trim()
      ? String(current.email).trim().toLowerCase()
      : null;
  if (has("email")) {
    const ev = validateEmail(b.email, { optional: true });
    if (!ev.ok) {
      const e = new Error(ev.error);
      e.code = "VALIDATION";
      throw e;
    }
    nextEmail = ev.value;
  }
  const emailChanged =
    has("email") &&
    (nextEmail || null) !==
      (current.email != null && String(current.email).trim()
        ? String(current.email).trim().toLowerCase()
        : null);
  if (emailChanged && nextEmail != null) {
    const taken = await findByEmail(nextEmail);
    if (taken && String(taken.id) !== String(userId)) {
      const e = new Error("อีเมลนี้ถูกใช้แล้ว");
      e.code = "EMAIL_TAKEN";
      throw e;
    }
  }

  const nextCc = has("countryCode")
    ? String(b.countryCode ?? "TH")
        .trim()
        .toUpperCase()
        .slice(0, 8) || "TH"
    : current.countryCode || "TH";
  const nextGender = has("gender")
    ? b.gender == null || String(b.gender).trim() === ""
      ? null
      : String(b.gender).trim().slice(0, 16)
    : current.gender;
  let nextBirth = current.birthDate;
  if (has("birthDate")) {
    if (b.birthDate == null || String(b.birthDate).trim() === "") {
      nextBirth = null;
    } else {
      nextBirth = normalizeBirthDate(b.birthDate);
    }
  }
  let nextRole = current.role || MEMBER;
  if (has("role")) {
    const r = String(b.role ?? "")
      .trim()
      .toLowerCase();
    if (![MEMBER, OWNER, ADMIN].includes(r)) {
      const e = new Error("role ต้องเป็น member, owner หรือ admin");
      e.code = "VALIDATION";
      throw e;
    }
    nextRole = r;
  }

  let nextAccountDisabled = Boolean(current.accountDisabled);
  if (has("accountDisabled")) {
    nextAccountDisabled = Boolean(b.accountDisabled);
  }

  const updateShipping = has("shippingAddressParts");
  const shipDb = updateShipping
    ? dbValuesFromParts({
        ...emptyParts(),
        ...(typeof b.shippingAddressParts === "object" && b.shippingAddressParts
          ? b.shippingAddressParts
          : {})
      })
    : null;

  const oldPhone = oldPhoneNorm;
  const newPhone = nextPhone;
  const phoneChanged = has("phone") && newPhone !== oldPhone;

  if (phoneChanged && newPhone != null) {
    const taken = await findByPhone(newPhone);
    if (taken && taken.id !== userId) {
      const e = new Error("เบอร์นี้ถูกใช้แล้ว");
      e.code = "PHONE_TAKEN";
      throw e;
    }
  }

  const pool = getPool();
  if (!pool) {
    const patch = {
      username: nextUsername,
      firstName: nextFirst,
      lastName: nextLast,
      phone: nextPhone,
      email: nextEmail,
      countryCode: nextCc,
      gender: nextGender,
      birthDate: nextBirth,
      role: nextRole,
      accountDisabled: nextAccountDisabled
    };
    if (updateShipping && shipDb) {
      patch.shippingAddress = shipDb.shipping_address;
      patch.shippingAddressParts = {
        ...emptyParts(),
        ...(typeof b.shippingAddressParts === "object" ? b.shippingAddressParts : {})
      };
    }
    userStore.updateUser(userId, patch);
    return findById(userId);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (phoneChanged) {
      await phoneHistoryService.insertWithClient(client, {
        userId,
        oldPhone,
        newPhone,
        clientIp:
          clientIp == null ? null : String(clientIp).split(",")[0].trim().slice(0, 64)
      });
    }
    if (updateShipping && shipDb) {
      await client.query(
        `UPDATE users SET
          username = $2,
          first_name = $3,
          last_name = $4,
          phone = $5,
          email = $6,
          country_code = $7,
          gender = $8,
          birth_date = $9,
          role = $10,
          shipping_address = $11,
          shipping_house_no = $12,
          shipping_moo = $13,
          shipping_road = $14,
          shipping_subdistrict = $15,
          shipping_district = $16,
          shipping_province = $17,
          shipping_postal_code = $18,
          account_disabled = $19
        WHERE id = $1::uuid`,
        [
          userId,
          nextUsername,
          nextFirst,
          nextLast,
          newPhone,
          nextEmail,
          nextCc,
          nextGender,
          nextBirth || null,
          nextRole,
          shipDb.shipping_address,
          shipDb.shipping_house_no,
          shipDb.shipping_moo,
          shipDb.shipping_road,
          shipDb.shipping_subdistrict,
          shipDb.shipping_district,
          shipDb.shipping_province,
          shipDb.shipping_postal_code,
          nextAccountDisabled
        ]
      );
    } else {
      await client.query(
        `UPDATE users SET
          username = $2,
          first_name = $3,
          last_name = $4,
          phone = $5,
          email = $6,
          country_code = $7,
          gender = $8,
          birth_date = $9,
          role = $10,
          account_disabled = $11
        WHERE id = $1::uuid`,
        [
          userId,
          nextUsername,
          nextFirst,
          nextLast,
          newPhone,
          nextEmail,
          nextCc,
          nextGender,
          nextBirth || null,
          nextRole,
          nextAccountDisabled
        ]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    if (e.code === "23505") {
      const d = String(e.detail || "").toLowerCase();
      if (d.includes("(phone)")) {
        const pe = new Error("เบอร์นี้ถูกใช้แล้ว");
        pe.code = "PHONE_TAKEN";
        throw pe;
      }
      if (d.includes("(username)")) {
        const ue = new Error("ชื่อผู้ใช้นี้ถูกใช้แล้ว");
        ue.code = "USERNAME_TAKEN";
        throw ue;
      }
      if (d.includes("email")) {
        const ee = new Error("อีเมลนี้ถูกใช้แล้ว");
        ee.code = "EMAIL_TAKEN";
        throw ee;
      }
    }
    throw e;
  } finally {
    client.release();
  }
  return findById(userId);
}

async function listMembers({ q = "", limit = 50, offset = 0 } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const off = Math.max(Number(offset) || 0, 0);
  const pool = getPool();
  if (!pool) {
    const rows = userStore.listForAdmin({ q, limit: lim, offset: off });
    const total = userStore.countForAdmin({ q });
    return {
      users: rows.map(adminMemberListItem),
      total,
      limit: lim,
      offset: off
    };
  }
  const qt = String(q || "").trim();
  if (qt) {
    const pattern = `%${qt}%`;
    const countR = await pool.query(
      `SELECT COUNT(*)::int AS c FROM users
       WHERE username ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1
          OR phone ILIKE $1 OR COALESCE(email, '') ILIKE $1
          OR CAST(id AS TEXT) ILIKE $1`,
      [pattern]
    );
    const total = countR.rows[0].c;
    const r = await pool.query(
      `SELECT * FROM users
       WHERE username ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1
          OR phone ILIKE $1 OR COALESCE(email, '') ILIKE $1
          OR CAST(id AS TEXT) ILIKE $1
       ORDER BY created_at DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      [pattern, lim, off]
    );
    const usersRaw = r.rows.map((row) => rowToUser(row));
    const ids = usersRaw.map((u) => String(u.id || "")).filter(Boolean);
    let roomGiftMap = new Map();
    if (ids.length > 0) {
      const rr = await pool.query(
        `SELECT user_id::text AS uid, COALESCE(SUM(balance), 0)::int AS total
         FROM user_room_red_balance
         WHERE user_id = ANY($1::uuid[])
         GROUP BY user_id`,
        [ids]
      );
      roomGiftMap = new Map(
        rr.rows.map((row) => [
          String(row.uid),
          Math.max(0, Math.floor(Number(row.total) || 0))
        ])
      );
    }
    return {
      users: usersRaw.map((u) =>
        adminMemberListItem({
          ...u,
          roomGiftRedTotal: roomGiftMap.get(String(u.id)) || 0
        })
      ),
      total,
      limit: lim,
      offset: off
    };
  }
  const countR = await pool.query(`SELECT COUNT(*)::int AS c FROM users`);
  const total = countR.rows[0].c;
  const r = await pool.query(
    `SELECT * FROM users ORDER BY created_at DESC NULLS LAST LIMIT $1 OFFSET $2`,
    [lim, off]
  );
  const usersRaw = r.rows.map((row) => rowToUser(row));
  const ids = usersRaw.map((u) => String(u.id || "")).filter(Boolean);
  let roomGiftMap = new Map();
  if (ids.length > 0) {
    const rr = await pool.query(
      `SELECT user_id::text AS uid, COALESCE(SUM(balance), 0)::int AS total
       FROM user_room_red_balance
       WHERE user_id = ANY($1::uuid[])
       GROUP BY user_id`,
      [ids]
    );
    roomGiftMap = new Map(
      rr.rows.map((row) => [
        String(row.uid),
        Math.max(0, Math.floor(Number(row.total) || 0))
      ])
    );
  }
  return {
    users: usersRaw.map((u) =>
      adminMemberListItem({
        ...u,
        roomGiftRedTotal: roomGiftMap.get(String(u.id)) || 0
      })
    ),
    total,
    limit: lim,
    offset: off
  };
}

module.exports = {
  findByUsername,
  findById,
  findByEmail,
  findByPhone,
  findByLineUserId,
  findByThaiFullName,
  createUser,
  createUserFromLine,
  syncLinePictureFromLine,
  setPasswordAndRole,
  setPasswordHashOnly,
  adjustHeartsBalance,
  adjustDualHearts,
  adjustDualHeartsWithClient,
  updateProfile,
  updateOfficialNames,
  publicUser,
  listPublicMemberDirectory,
  adminMemberListItem,
  adminMemberDetail,
  listMembers,
  adjustAdminTripleHearts,
  adminPatchMember
};
