/** ตรวจข้อมูลสมาชิก — ชื่อตามประเทศที่เลือก */

const THAI_ONLY = /^[\u0E00-\u0E7F]{1,50}$/;
const THAI_SCRIPT = /[\u0E00-\u0E7F]/;
const HAS_LATIN = /[A-Za-z]/;
const LATIN_NAME = /^(?=.*[A-Za-z])[A-Za-z\s\-'.]{2,50}$/;
const USERNAME = /^[a-z0-9_]{3,32}$/;
const PHONE = /^0[0-9]{9}$/;

const COUNTRY_TH = "TH";
const COUNTRY_NON_TH = "NON_TH";

function cleanStr(v) {
  if (v == null) return "";
  return String(v).trim();
}

/**
 * @param {{ firstNameEnglishHint?: boolean, lastNameEnglishHint?: boolean }} [opts]
 */
function validateThaiName(label, value, opts = {}) {
  const s = cleanStr(value);
  if (!s) return { ok: false, error: `กรุณากรอก${label}` };
  if (!THAI_ONLY.test(s)) {
    if (opts.firstNameEnglishHint && HAS_LATIN.test(s)) {
      return {
        ok: false,
        error:
          "หากเป็นคนไทยกรุณากรอกชื่อเป็นภาษาไทยให้ตรงตามบัตรประชาชน (ไม่ใช้ตัวอักษรอังกฤษ)"
      };
    }
    if (opts.lastNameEnglishHint && HAS_LATIN.test(s)) {
      return {
        ok: false,
        error:
          "หากเป็นคนไทยกรุณากรอกนามสกุลเป็นภาษาไทยให้ตรงตามบัตรประชาชน (ไม่ใช้ตัวอักษรอังกฤษ)"
      };
    }
    return {
      ok: false,
      error: `${label}ต้องเป็นภาษาไทยเท่านั้น (ไม่มีเลขหรืออักษรอังกฤษ)`
    };
  }
  return { ok: true, value: s };
}

function validateLatinName(label, value) {
  const s = cleanStr(value);
  if (!s) return { ok: false, error: `กรุณากรอก${label}` };
  if (THAI_SCRIPT.test(s)) {
    return {
      ok: false,
      error: `หากถือเอกสารไทยให้เลือก "ประเทศไทย" แล้วกรอก${label}เป็นภาษาไทย`
    };
  }
  if (!LATIN_NAME.test(s)) {
    return {
      ok: false,
      error: `${label} (ภาษาอังกฤษ) ใช้ได้เฉพาะ A–z ช่องว่าง . ' - ความยาว 2–50 ตัว`
    };
  }
  return { ok: true, value: s };
}

function validateCountryCode(value) {
  const c = cleanStr(value).toUpperCase();
  if (c === COUNTRY_TH) return { ok: true, value: COUNTRY_TH };
  if (c === COUNTRY_NON_TH) return { ok: true, value: COUNTRY_NON_TH };
  return {
    ok: false,
    error: 'กรุณาเลือกประเทศ — "ประเทศไทย" หรือ "ต่างประเทศ (ชื่อภาษาอังกฤษ)"'
  };
}

/** ใช้ทั้ง register และ check-duplicate */
function validateRegisterNames(countryCode, firstName, lastName) {
  const country = validateCountryCode(countryCode);
  if (!country.ok) return country;
  if (country.value === COUNTRY_TH) {
    const first = validateThaiName("ชื่อ", firstName, {
      firstNameEnglishHint: true
    });
    if (!first.ok) return first;
    const last = validateThaiName("นามสกุล", lastName, {
      lastNameEnglishHint: true
    });
    if (!last.ok) return last;
    return {
      ok: true,
      firstName: first.value,
      lastName: last.value,
      countryCode: country.value
    };
  }
  const first = validateLatinName("ชื่อ", firstName);
  if (!first.ok) return first;
  const last = validateLatinName("นามสกุล", lastName);
  if (!last.ok) return last;
  return {
    ok: true,
    firstName: first.value,
    lastName: last.value,
    countryCode: country.value
  };
}

function validatePhone(value) {
  const s = cleanStr(value).replace(/\s+/g, "");
  if (!s) return { ok: false, error: "กรุณากรอกเบอร์โทรศัพท์" };
  if (!PHONE.test(s)) {
    return { ok: false, error: "เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0" };
  }
  return { ok: true, value: s };
}

function validateUsername(value) {
  const s = cleanStr(value).toLowerCase();
  if (!s) return { ok: false, error: "กรุณาตั้งชื่อผู้ใช้" };
  if (!USERNAME.test(s)) {
    return {
      ok: false,
      error:
        "ชื่อผู้ใช้ใช้ได้เฉพาะ a–z ตัวเลข และ _ ความยาว 3–32 ตัว"
    };
  }
  return { ok: true, value: s };
}

function validatePassword(value) {
  const s = String(value ?? "");
  if (s.length < 6) {
    return { ok: false, error: "รหัสผ่านอย่างน้อย 6 ตัวอักษร" };
  }
  if (s.length > 128) {
    return { ok: false, error: "รหัสผ่านยาวเกินไป" };
  }
  return { ok: true, value: s };
}

function parseDuplicateAcknowledged(body) {
  const v = body?.duplicateNameAcknowledged;
  return v === true || v === "true" || v === 1;
}

function validateRegisterBody(body) {
  const names = validateRegisterNames(body.countryCode, body.firstName, body.lastName);
  if (!names.ok) return names;
  const phone = validatePhone(body.phone);
  if (!phone.ok) return phone;
  const user = validateUsername(body.username);
  if (!user.ok) return user;
  const pass = validatePassword(body.password);
  if (!pass.ok) return pass;
  const confirm = String(body.passwordConfirm ?? "");
  if (confirm !== pass.value) {
    return { ok: false, error: "รหัสผ่านยืนยันไม่ตรงกัน" };
  }
  return {
    ok: true,
    data: {
      firstName: names.firstName,
      lastName: names.lastName,
      countryCode: names.countryCode,
      phone: phone.value,
      username: user.value,
      password: pass.value,
      duplicateNameAcknowledged: parseDuplicateAcknowledged(body)
    }
  };
}

function validateLoginBody(body) {
  const user = validateUsername(body.username);
  if (!user.ok) return user;
  const raw = String(body.password ?? "");
  if (!raw) return { ok: false, error: "กรุณากรอกรหัสผ่าน" };
  return {
    ok: true,
    data: { username: user.value, password: raw }
  };
}

module.exports = {
  validateRegisterBody,
  validateLoginBody,
  validateRegisterNames,
  parseDuplicateAcknowledged,
  validateUsername,
  validatePassword,
  validatePhone,
  COUNTRY_TH,
  COUNTRY_NON_TH
};
