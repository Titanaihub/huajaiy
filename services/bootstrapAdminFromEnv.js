const bcrypt = require("bcryptjs");
const {
  validateUsername,
  validatePassword,
  validatePhone
} = require("../authValidators");
const { ADMIN } = require("../constants/roles");
const userService = require("./userService");

/** ทดลอง: เบอร์ 10 หลักที่พิมพ์ลืม 0 นำหน้า (เช่น 1234567890) → ใช้ 0 + 9 หลักหลัง */
function resolveBootstrapPhone(raw) {
  const s = String(raw ?? "").replace(/\s+/g, "");
  let v = validatePhone(s);
  if (v.ok) return v;
  if (/^[1-9][0-9]{9}$/.test(s)) {
    v = validatePhone(`0${s.slice(1)}`);
    if (v.ok) return v;
  }
  return validatePhone(s);
}

/**
 * สร้างหรืออัปเดตบัญชีแอดมินจาก env — ไม่ต้องสมัครผ่านเว็บก่อน
 *
 * BOOTSTRAP_ADMIN_USERNAME — ชื่อผู้ใช้ (a–z ตัวเลข _ ยาว 3–32)
 * BOOTSTRAP_ADMIN_PASSWORD — รหัสผ่าน (อย่างน้อย 6 ตัว ตามระบบสมัครสมาชิก)
 * BOOTSTRAP_ADMIN_PHONE — เบอร์ 10 หลัก 0xxxxxxxxx (จำเป็นเฉพาะเมื่อยังไม่มี user นี้)
 *
 * ถ้ามี user อยู่แล้ว: อัปเดตรหัสผ่าน + ตั้ง role admin (ไม่ต้องใส่เบอร์)
 */
async function bootstrapAdminFromEnv() {
  const rawUser = process.env.BOOTSTRAP_ADMIN_USERNAME;
  const rawPass = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (rawUser == null || String(rawUser).trim() === "") return;
  if (rawPass == null || rawPass === "") return;

  const vu = validateUsername(rawUser);
  if (!vu.ok) {
    console.warn(`[admin-bootstrap] ${vu.error}`);
    return;
  }
  const vp = validatePassword(rawPass);
  if (!vp.ok) {
    console.warn(`[admin-bootstrap] ${vp.error}`);
    return;
  }

  const username = vu.value;
  const hash = bcrypt.hashSync(vp.value, 10);
  const existing = await userService.findByUsername(username);

  if (existing) {
    await userService.setPasswordAndRole(existing.id, hash, ADMIN);
    console.log(
      `[admin-bootstrap] อัปเดตรหัสผ่าน + ตั้ง admin ให้ "${username}" แล้ว — ล็อกอินด้วย username/รหัสที่ใส่ใน BOOTSTRAP_ADMIN_*`
    );
    return;
  }

  const vph = resolveBootstrapPhone(process.env.BOOTSTRAP_ADMIN_PHONE ?? "");
  if (!vph.ok) {
    console.warn(
      `[admin-bootstrap] ยังไม่มี user "${username}" — ตั้ง BOOTSTRAP_ADMIN_PHONE เป็นเบอร์ 10 หลักขึ้นต้น 0 (เช่น 0812345678) แล้ว deploy อีกครั้ง`
    );
    return;
  }

  try {
    await userService.createUser({
      username,
      passwordHash: hash,
      firstName: "ผู้ดูแล",
      lastName: "ระบบ",
      phone: vph.value,
      countryCode: "TH",
      registrationIp: null,
      role: ADMIN
    });
    console.log(
      `[admin-bootstrap] สร้างแอดมิน "${username}" แล้ว — ล็อกอินด้วย username + รหัสจาก env แล้วลบ env ทั้งสามตัวเพื่อความปลอดภัย`
    );
  } catch (e) {
    if (e.code === "PHONE_TAKEN") {
      console.warn(
        "[admin-bootstrap] เบอร์นี้ถูกใช้แล้ว — เปลี่ยน BOOTSTRAP_ADMIN_PHONE หรือลบ user เดิม"
      );
    } else {
      console.warn("[admin-bootstrap]", e.message);
    }
  }
}

module.exports = { bootstrapAdminFromEnv };
