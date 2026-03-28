const bcrypt = require("bcryptjs");
const {
  validateUsername,
  validatePassword,
  validatePhone
} = require("../authValidators");
const { ADMIN } = require("../constants/roles");
const userService = require("./userService");

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

  const vph = validatePhone(process.env.BOOTSTRAP_ADMIN_PHONE ?? "");
  if (!vph.ok) {
    console.warn(
      `[admin-bootstrap] ยังไม่มี user "${username}" — ตั้ง BOOTSTRAP_ADMIN_PHONE (เบอร์ 10 หลัก) แล้ว deploy อีกครั้งเพื่อสร้างบัญชีแอดมิน`
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
