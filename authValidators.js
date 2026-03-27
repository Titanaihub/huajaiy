/** ตรวจข้อมูลสมาชิก — ชื่อ–นามสกุลเป็นภาษาไทยเท่านั้น */

const THAI_ONLY = /^[\u0E00-\u0E7F]{1,50}$/;
const USERNAME = /^[a-z0-9_]{3,32}$/;
const PHONE = /^0[0-9]{9}$/;

function cleanStr(v) {
  if (v == null) return "";
  return String(v).trim();
}

function validateThaiName(label, value) {
  const s = cleanStr(value);
  if (!s) return { ok: false, error: `กรุณากรอก${label}` };
  if (!THAI_ONLY.test(s)) {
    return {
      ok: false,
      error: `${label}ต้องเป็นภาษาไทยเท่านั้น (ไม่มีเลขหรืออักษรอังกฤษ)`
    };
  }
  return { ok: true, value: s };
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

function validateRegisterBody(body) {
  const first = validateThaiName("ชื่อ", body.firstName);
  if (!first.ok) return first;
  const last = validateThaiName("นามสกุล", body.lastName);
  if (!last.ok) return last;
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
      firstName: first.value,
      lastName: last.value,
      phone: phone.value,
      username: user.value,
      password: pass.value
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
  validateLoginBody
};
