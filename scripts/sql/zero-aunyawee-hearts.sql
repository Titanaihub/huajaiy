-- รันใน Render → PostgreSQL → Connect (หรือ psql / แท็บ Query ถ้ามี)
-- เคลียร์ยอดหัวใจบัญชี username aunyawee เป็น 0 ทั้งหมด (ครั้งเดียว)
--
-- ถ้าไม่แน่ใจ username จริง รันก่อน:
--   SELECT id, username FROM users WHERE username ILIKE '%auny%' OR username ILIKE '%anyawee%';

BEGIN;

UPDATE users SET
  pink_hearts_balance = 0,
  red_hearts_balance = 0,
  red_giveaway_balance = 0,
  hearts_balance = 0
WHERE username = 'aunyawee';

-- ถ้าแถวที่อัปเดต = 0 ลองสะกดอื่นในฐานข้อมูล:
-- UPDATE users SET ... WHERE username ILIKE '%aunyawee%' OR username ILIKE '%anyawee%';

SELECT id, username,
  pink_hearts_balance, red_hearts_balance, red_giveaway_balance, hearts_balance
FROM users
WHERE username = 'aunyawee';

COMMIT;
