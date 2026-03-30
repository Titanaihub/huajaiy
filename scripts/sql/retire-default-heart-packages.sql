-- หยุดขายถาวรแพ็กชื่อ「เริ่มต้น」「โปร」 (หลังมีคอลัมน์ retired แล้ว — รัน init / deploy API)
BEGIN;
UPDATE heart_packages
SET retired = TRUE, active = FALSE
WHERE title IN ('เริ่มต้น', 'โปร');
SELECT id, title, active, retired FROM heart_packages WHERE title IN ('เริ่มต้น', 'โปร');
COMMIT;
