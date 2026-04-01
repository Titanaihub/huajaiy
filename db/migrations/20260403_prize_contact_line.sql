-- LINE / ลิงก์ติดต่อรับรางวัล — ผู้สร้างเกมตั้งในโปรไฟล์ ผู้ชนะเห็นในหน้ารางวัล
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS prize_contact_line VARCHAR(500);
