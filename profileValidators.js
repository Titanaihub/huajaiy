const {
  validateRegisterNames,
  validatePhone,
  validateEmail,
  validateUsername
} = require("./authValidators");
const { KEYS, MAX_FIELD, MAX_POSTAL, emptyParts } = require("./shippingAddress");

const ALLOWED_GENDER = new Set(["male", "female", "other"]);

/**
 * @returns {null | { update: true, value: string | null } | { error: string }}
 */
function optionalHttpsUrlField(body, key, maxLen) {
  if (!Object.prototype.hasOwnProperty.call(body, key)) return null;
  const raw = body[key];
  if (raw == null || String(raw).trim() === "") {
    return { update: true, value: null };
  }
  const s = String(raw).trim();
  if (!/^https:\/\//i.test(s)) {
    return { error: "ลิงก์ต้องขึ้นต้นด้วย https://" };
  }
  if (s.length > maxLen) {
    return {
      error:
        maxLen >= 1024
          ? "ลิงก์รูปโปรไฟล์ยาวเกินกำหนด"
          : "ลิงก์โซเชียลยาวเกิน 500 ตัวอักษร"
    };
  }
  return { update: true, value: s };
}

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

/**
 * @param {object} body
 * @param {{ countryCode?: string, selfServiceNameEditsUsed?: number, currentFirstName?: string, currentLastName?: string }} [ctx]
 */
function validateProfilePatch(body, ctx = {}) {
  const countryCode = ctx.countryCode || "TH";
  const selfUsed = Math.max(0, Math.floor(Number(ctx.selfServiceNameEditsUsed) || 0));
  const curFn = String(ctx.currentFirstName ?? "").trim();
  const curLn = String(ctx.currentLastName ?? "").trim();
  let updateGender = false;
  let gender = null;
  if (Object.prototype.hasOwnProperty.call(body, "gender")) {
    updateGender = true;
    const genderRaw = body.gender;
    const genderStr =
      genderRaw == null || genderRaw === ""
        ? null
        : String(genderRaw).toLowerCase().trim();
    if (genderStr !== null && genderStr !== "" && !ALLOWED_GENDER.has(genderStr)) {
      return {
        ok: false,
        error: "เพศต้องเป็น ชาย / หญิง / อื่นๆ หรือเว้นว่าง"
      };
    }
    gender = genderStr === null || genderStr === "" ? null : genderStr;
  }

  let updateBirthDate = false;
  let birthDate = null;
  if (Object.prototype.hasOwnProperty.call(body, "birthDate")) {
    updateBirthDate = true;
    const birth = validateBirthDate(body.birthDate);
    if (!birth.ok) return birth;
    birthDate = birth.value;
  }

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

  let phone;
  let updatePhone = false;
  if (Object.prototype.hasOwnProperty.call(body, "phone")) {
    updatePhone = true;
    const pv = validatePhone(body.phone, { optional: true });
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

  let firstName;
  let lastName;
  let updateNames = false;
  if (
    Object.prototype.hasOwnProperty.call(body, "firstName") ||
    Object.prototype.hasOwnProperty.call(body, "lastName")
  ) {
    updateNames = true;
    if (
      !Object.prototype.hasOwnProperty.call(body, "firstName") ||
      !Object.prototype.hasOwnProperty.call(body, "lastName")
    ) {
      return {
        ok: false,
        error: "กรุณากรอกทั้งชื่อและนามสกุลคู่กัน"
      };
    }
    const names = validateRegisterNames(
      countryCode,
      body.firstName,
      body.lastName
    );
    if (!names.ok) return names;
    firstName = names.firstName;
    lastName = names.lastName;
    const changing =
      firstName !== curFn || lastName !== curLn;
    if (changing && selfUsed >= 3) {
      return {
        ok: false,
        error:
          "แก้ชื่อ–นามสกุลเองได้ครบ 3 ครั้งแล้ว — ใช้คำขอแอดมินด้านล่าง"
      };
    }
  }

  let username;
  let updateUsername = false;
  if (Object.prototype.hasOwnProperty.call(body, "username")) {
    updateUsername = true;
    const vu = validateUsername(body.username);
    if (!vu.ok) return vu;
    username = vu.value;
  }

  let email;
  let updateEmail = false;
  if (Object.prototype.hasOwnProperty.call(body, "email")) {
    updateEmail = true;
    const ev = validateEmail(body.email, { optional: true });
    if (!ev.ok) return ev;
    email = ev.value;
  }

  let profilePictureUrl = null;
  let updateProfilePicture = false;
  const picRes = optionalHttpsUrlField(body, "profilePictureUrl", 1024);
  if (picRes && picRes.error) return { ok: false, error: picRes.error };
  if (picRes && picRes.update) {
    updateProfilePicture = true;
    profilePictureUrl = picRes.value;
  }

  let socialFacebookUrl = null;
  let updateSocialFacebook = false;
  const fbRes = optionalHttpsUrlField(body, "socialFacebookUrl", 500);
  if (fbRes && fbRes.error) return { ok: false, error: fbRes.error };
  if (fbRes && fbRes.update) {
    updateSocialFacebook = true;
    socialFacebookUrl = fbRes.value;
  }

  let socialLineUrl = null;
  let updateSocialLine = false;
  const lineRes = optionalHttpsUrlField(body, "socialLineUrl", 500);
  if (lineRes && lineRes.error) return { ok: false, error: lineRes.error };
  if (lineRes && lineRes.update) {
    updateSocialLine = true;
    socialLineUrl = lineRes.value;
  }

  let socialTiktokUrl = null;
  let updateSocialTiktok = false;
  const ttRes = optionalHttpsUrlField(body, "socialTiktokUrl", 500);
  if (ttRes && ttRes.error) return { ok: false, error: ttRes.error };
  if (ttRes && ttRes.update) {
    updateSocialTiktok = true;
    socialTiktokUrl = ttRes.value;
  }

  return {
    ok: true,
    data: {
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
      updateSocialTiktok
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
