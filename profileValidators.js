const { validateRegisterNames } = require("./authValidators");

const ALLOWED_GENDER = new Set(["male", "female", "other"]);

function cleanStr(v) {
  if (v == null) return "";
  return String(v).trim();
}

/** YYYY-MM-DD หรือว่าง */
function validateBirthDate(value) {
  if (value == null || value === "") {
    return { ok: true, value: null };
  }
  const s = cleanStr(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return { ok: false, error: "วันเกิดใช้รูปแบบ ปี-เดือน-วัน (YYYY-MM-DD)" };
  }
  const d = new Date(`${s}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    return { ok: false, error: "วันเกิดไม่ถูกต้อง" };
  }
  const y = d.getUTCFullYear();
  if (y < 1900 || y > new Date().getUTCFullYear()) {
    return { ok: false, error: "ปีเกิดไม่สมเหตุสมผล" };
  }
  return { ok: true, value: s };
}

function validateProfilePatch(body) {
  const genderRaw = body?.gender;
  const gender =
    genderRaw == null || genderRaw === ""
      ? null
      : String(genderRaw).toLowerCase().trim();
  if (gender !== null && gender !== "" && !ALLOWED_GENDER.has(gender)) {
    return {
      ok: false,
      error: "เพศต้องเป็น ชาย / หญิง / อื่นๆ หรือเว้นว่าง"
    };
  }
  const birth = validateBirthDate(body?.birthDate);
  if (!birth.ok) return birth;
  const addr = body?.shippingAddress;
  if (addr != null && String(addr).length > 2000) {
    return { ok: false, error: "ที่อยู่จัดส่งยาวเกิน 2,000 ตัวอักษร" };
  }
  const shippingAddress =
    addr == null || String(addr).trim() === "" ? null : String(addr).trim();
  const g =
    gender === null || gender === "" ? null : gender;
  return {
    ok: true,
    data: {
      gender: g,
      birthDate: birth.value,
      shippingAddress
    }
  };
}

function validateNameChangeRequest(countryCode, body) {
  const reason = cleanStr(body?.reason);
  if (reason.length < 10) {
    return { ok: false, error: "กรุณาระบุเหตุผลอย่างน้อย 10 ตัวอักษร" };
  }
  if (reason.length > 2000) {
    return { ok: false, error: "เหตุผลยาวเกิน 2,000 ตัวอักษร" };
  }
  const names = validateRegisterNames(
    countryCode,
    body?.requestedFirstName,
    body?.requestedLastName
  );
  if (!names.ok) return names;
  return {
    ok: true,
    data: {
      requestedFirstName: names.firstName,
      requestedLastName: names.lastName,
      reason
    }
  };
}

module.exports = {
  validateProfilePatch,
  validateNameChangeRequest
};
