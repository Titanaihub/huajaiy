/**
 * ตรงกับ authValidators.js — แก้ทั้งสองที่ถ้าเปลี่ยนกติกา
 */

export const COUNTRY_TH = "TH";
export const COUNTRY_NON_TH = "NON_TH";

const THAI_ONLY = /^[\u0E00-\u0E7F]{1,50}$/;
const THAI_SCRIPT = /[\u0E00-\u0E7F]/;
const HAS_LATIN = /[A-Za-z]/;
const LATIN_NAME = /^(?=.*[A-Za-z])[A-Za-z\s\-'.]{2,50}$/;
const USERNAME = /^[a-z0-9_]{3,32}$/;
const PHONE = /^0[0-9]{9}$/;

function cleanStr(v) {
  if (v == null) return "";
  return String(v).trim();
}

export const firstNameEnglishHint =
  "หากเป็นคนไทยกรุณากรอกชื่อเป็นภาษาไทยให้ตรงตามบัตรประชาชน (ไม่ใช้ตัวอักษรอังกฤษ)";

export const lastNameEnglishHint =
  "หากเป็นคนไทยกรุณากรอกนามสกุลเป็นภาษาไทยให้ตรงตามบัตรประชาชน (ไม่ใช้ตัวอักษรอังกฤษ)";

function validateCountryClient(value) {
  const c = cleanStr(value).toUpperCase();
  if (c === COUNTRY_TH) return { ok: true, value: COUNTRY_TH };
  if (c === COUNTRY_NON_TH) return { ok: true, value: COUNTRY_NON_TH };
  return {
    ok: false,
    error: 'กรุณาเลือกประเทศ — "ประเทศไทย" หรือ "ต่างประเทศ (ชื่อภาษาอังกฤษ)"'
  };
}

export function validateThaiFirstName(value) {
  const s = cleanStr(value);
  if (!s) return { ok: false, error: "กรุณากรอกชื่อ" };
  if (!THAI_ONLY.test(s)) {
    if (HAS_LATIN.test(s)) {
      return { ok: false, error: firstNameEnglishHint };
    }
    return {
      ok: false,
      error: "ชื่อต้องเป็นภาษาไทยเท่านั้น (ไม่มีเลขหรืออักษรอังกฤษ)"
    };
  }
  return { ok: true, value: s };
}

export function validateThaiLastName(value) {
  const s = cleanStr(value);
  if (!s) return { ok: false, error: "กรุณากรอกนามสกุล" };
  if (!THAI_ONLY.test(s)) {
    if (HAS_LATIN.test(s)) {
      return { ok: false, error: lastNameEnglishHint };
    }
    return {
      ok: false,
      error: "นามสกุลต้องเป็นภาษาไทยเท่านั้น (ไม่มีเลขหรืออักษรอังกฤษ)"
    };
  }
  return { ok: true, value: s };
}

export function validateLatinFirstName(value) {
  const s = cleanStr(value);
  if (!s) return { ok: false, error: "กรุณากรอกชื่อ" };
  if (THAI_SCRIPT.test(s)) {
    return {
      ok: false,
      error:
        'หากถือเอกสารไทยให้เลือก "ประเทศไทย" แล้วกรอกชื่อเป็นภาษาไทย'
    };
  }
  if (!LATIN_NAME.test(s)) {
    return {
      ok: false,
      error:
        "ชื่อ (ภาษาอังกฤษ) ใช้ได้เฉพาะ A–z ช่องว่าง . ' - ความยาว 2–50 ตัว"
    };
  }
  return { ok: true, value: s };
}

export function validateLatinLastName(value) {
  const s = cleanStr(value);
  if (!s) return { ok: false, error: "กรุณากรอกนามสกุล" };
  if (THAI_SCRIPT.test(s)) {
    return {
      ok: false,
      error:
        'หากถือเอกสารไทยให้เลือก "ประเทศไทย" แล้วกรอกนามสกุลเป็นภาษาไทย'
    };
  }
  if (!LATIN_NAME.test(s)) {
    return {
      ok: false,
      error:
        "นามสกุล (ภาษาอังกฤษ) ใช้ได้เฉพาะ A–z ช่องว่าง . ' - ความยาว 2–50 ตัว"
    };
  }
  return { ok: true, value: s };
}

/** สำหรับเรียก check-duplicate API — คืน { ok, firstName, lastName } หรือ { ok: false, error } */
export function validateNamesForCountry(countryCode, firstName, lastName) {
  const country = validateCountryClient(countryCode);
  if (!country.ok) return country;
  if (country.value === COUNTRY_TH) {
    const first = validateThaiFirstName(firstName);
    if (!first.ok) return first;
    const last = validateThaiLastName(lastName);
    if (!last.ok) return last;
    return { ok: true, firstName: first.value, lastName: last.value };
  }
  const first = validateLatinFirstName(firstName);
  if (!first.ok) return first;
  const last = validateLatinLastName(lastName);
  if (!last.ok) return last;
  return { ok: true, firstName: first.value, lastName: last.value };
}

export function validatePhoneClient(value) {
  const s = cleanStr(value).replace(/\s+/g, "");
  if (!s) return { ok: false, error: "กรุณากรอกเบอร์โทรศัพท์" };
  if (!PHONE.test(s)) {
    return {
      ok: false,
      error: "เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0"
    };
  }
  return { ok: true, value: s };
}

export function validateUsernameClient(value) {
  const s = cleanStr(value).toLowerCase();
  if (!s) return { ok: false, error: "กรุณาตั้งชื่อผู้ใช้" };
  if (!USERNAME.test(s)) {
    return {
      ok: false,
      error: "ชื่อผู้ใช้ใช้ได้เฉพาะ a–z ตัวเลข และ _ ความยาว 3–32 ตัว"
    };
  }
  return { ok: true, value: s };
}

export function validatePasswordClient(password, passwordConfirm) {
  const s = String(password ?? "");
  if (s.length < 6) {
    return { ok: false, error: "รหัสผ่านอย่างน้อย 6 ตัวอักษร" };
  }
  if (s.length > 128) {
    return { ok: false, error: "รหัสผ่านยาวเกินไป" };
  }
  if (String(passwordConfirm ?? "") !== s) {
    return { ok: false, error: "รหัสผ่านยืนยันไม่ตรงกัน" };
  }
  return { ok: true, value: s };
}

/**
 * nameDuplicate: true เมื่อ API บอกซ้ำ
 * duplicateChoice: '' | 'repeat' | 'first_time'
 */
export function validateRegisterFormClient(body) {
  const country = validateCountryClient(body.countryCode);
  if (!country.ok) return country;

  const names = validateNamesForCountry(
    country.value,
    body.firstName,
    body.lastName
  );
  if (!names.ok) return names;

  if (body.nameDuplicate === true) {
    const ch = body.duplicateChoice;
    if (!ch) {
      return {
        ok: false,
        error:
          "ชื่อและนามสกุลนี้มีในระบบแล้ว — กรุณาเลือกยืนยันว่าเคยสมัครมาก่อนหรือไม่"
      };
    }
    if (ch === "repeat") {
      return {
        ok: false,
        error:
          "หากเคยสมัครแล้วกรุณาเข้าสู่ระบบ — จำรหัสไม่ได้ให้ติดต่อเจ้าหน้าที่ แทนการสมัครใหม่"
      };
    }
  }

  const phone = validatePhoneClient(body.phone);
  if (!phone.ok) return phone;
  const user = validateUsernameClient(body.username);
  if (!user.ok) return user;
  const pass = validatePasswordClient(body.password, body.passwordConfirm);
  if (!pass.ok) return pass;
  return { ok: true };
}

/** ช่องชื่อไทย + มีตัวอังกฤษ */
export function shouldShowThaiEnglishHint(countryCode, value) {
  const c = validateCountryClient(countryCode);
  if (!c.ok || c.value !== COUNTRY_TH) return false;
  const s = String(value ?? "");
  return s.length > 0 && HAS_LATIN.test(s);
}

/** ช่องชื่ออังกฤษ + มีตัวไทย */
export function shouldShowLatinThaiHint(countryCode, value) {
  const c = validateCountryClient(countryCode);
  if (!c.ok || c.value !== COUNTRY_NON_TH) return false;
  const s = String(value ?? "");
  return s.length > 0 && THAI_SCRIPT.test(s);
}
