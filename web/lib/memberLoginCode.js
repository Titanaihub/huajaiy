/** รหัสสมาชิกจาก LINE: ตัวอักษร 2 หรือ 3 ตัวหน้า (a–z ไม่มี o) + ตัวเลข 1–9 ท้าย รวม 6 หลัก */

export function sanitizeMemberLoginCodeInput(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/[^a-np-z1-9]/g, "")
    .slice(0, 6);
}

/** รูปแบบใหม่: ตัวอักษรหน้า 2 หรือ 3 ตัว + เลขท้าย */
export function isNewFormatMemberLoginCode(s) {
  const c = String(s || "").toLowerCase().trim();
  return (
    c.length === 6 &&
    (/^[a-np-z]{2}[1-9]{4}$/.test(c) || /^[a-np-z]{3}[1-9]{3}$/.test(c))
  );
}

/** รับทั้งรูปแบบใหม่ และรุ่นเก่า (สลับตัวอักษร/เลข 6 หลัก ไม่มี 0/o) */
export function isValidMemberLoginCode(s) {
  if (isNewFormatMemberLoginCode(s)) return true;
  const c = String(s || "").toLowerCase().trim();
  return (
    c.length === 6 &&
    /^[a-np-z1-9]{6}$/.test(c) &&
    /[a-z]/.test(c) &&
    /[1-9]/.test(c)
  );
}
