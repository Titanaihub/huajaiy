-- ผู้ชนะกดยืนยันรับรางวัลแบบมารับเอง — ผู้สร้างเห็นเวลาในรายการ incoming
ALTER TABLE central_prize_awards
  ADD COLUMN IF NOT EXISTS winner_pickup_ack_at TIMESTAMPTZ;
