-- HUAJAIY: การจ่ายรางวัลตามกติกา (เงินสด: มารับเอง/โอน · สิ่งของ: มารับเอง/จัดส่ง)
-- รันได้ซ้ำได้ (idempotent) — ใช้กับ Render Postgres เมื่อ deploy แล้ว DB ยังไม่มีคอลัมน์นี้
-- ข้อกำหนด: มีตาราง central_game_rules, central_prize_awards แล้ว

ALTER TABLE central_game_rules
ADD COLUMN IF NOT EXISTS prize_fulfillment_mode VARCHAR(16);

UPDATE central_game_rules
SET prize_fulfillment_mode = CASE
  WHEN prize_category = 'cash' THEN 'transfer'
  WHEN prize_category = 'item' THEN 'ship'
  ELSE NULL
END
WHERE prize_fulfillment_mode IS NULL;

ALTER TABLE central_prize_awards
ADD COLUMN IF NOT EXISTS prize_fulfillment_mode VARCHAR(16);

UPDATE central_prize_awards a
SET prize_fulfillment_mode = CASE
  WHEN a.prize_category = 'item' AND NULLIF(TRIM(COALESCE(a.item_fulfillment_mode, '')), '') IS NOT NULL
    THEN LOWER(TRIM(a.item_fulfillment_mode))
  WHEN a.prize_category = 'item' THEN 'ship'
  WHEN a.prize_category = 'cash' THEN 'transfer'
  ELSE NULL
END
WHERE a.prize_fulfillment_mode IS NULL;
