const { validateRegisterNames, validatePhone } = require("./authValidators");
const { KEYS, MAX_FIELD, MAX_POSTAL, emptyParts } = require("./shippingAddress");

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

  let shippingParts = null;
  let updateShipping = false;
  if (Object.prototype.hasOwnProperty.call(body, "shippingAddressParts")) {
    updateShipping = true;
    const raw = body.shippingAddressParts;
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, error: "รูปแบบที่อยู่จัดส่งไม่ถูกต้อง" };
    }
    const out = emptyParts();
    for (const k of KEYS) {
      const v = raw[k];
      const s = v == null ? "" : String(v).trim();
      const max = k === "postalCode" ? MAX_POSTAL : MAX_FIELD;
      if (s.length > max) {
        return {
          ok: false,
          error:
            k === "postalCode"
              ? "รหัสไปรษณีย์ยาวเกินกำหนด"
              : "ช่องที่อยู่แต่ละช่องยาวเกิน 200 ตัวอักษร"
        };
      }
      out[k] = s;
    }
    shippingParts = out;
  }

  const g =
    gender === null || gender === "" ? null : gender;
  let phone;
  let updatePhone = false;
  if (Object.prototype.hasOwnProperty.call(body, "phone")) {
    updatePhone = true;
    const pv = validatePhone(body.phone);
    if (!pv.ok) return pv;
    phone = pv.value;
  }

  let prizeContactLine = null;
  let updatePrizeContactLine = false;
  if (Object.prototype.hasOwnProperty.call(body, "prizeContactLine")) {
    updatePrizeContactLine = true;
    const rawPl =
      body.prizeContactLine == null ? "" : String(body.prizeContactLine).trim();
    if (rawPl.length > 500) {
      return { ok: false, error: "ข้อความติดต่อรับรางวัลยาวเกิน 500 ตัวอักษร" };
    }
    prizeContactLine = rawPl === "" ? null : rawPl;
  }

  return {
    ok: true,
    data: {
      gender: g,
      birthDate: birth.value,
      shippingParts,
      updateShipping,
      phone,
      updatePhone,
      prizeContactLine,
      updatePrizeContactLine
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
