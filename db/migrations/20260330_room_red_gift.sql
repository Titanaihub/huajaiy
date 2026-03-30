-- HUAJAIY: หัวใจแดงจากรหัสห้อง + เกมส่วนกลางรับ gift red (allow_gift_red_play)
-- รันได้ซ้ำได้ (idempotent) — ใช้กับ Render Postgres เมื่อต้องการรันมือ หรือ DB ยังไม่ผ่าน initDb ล่าสุด
-- ข้อกำหนด: มีตาราง users, central_games แล้ว

ALTER TABLE central_games
ADD COLUMN IF NOT EXISTS allow_gift_red_play BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS user_room_red_balance (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_user_room_red_balance_creator ON user_room_red_balance(creator_id);

CREATE TABLE IF NOT EXISTS room_red_gift_codes (
  id UUID PRIMARY KEY,
  code VARCHAR(16) NOT NULL UNIQUE,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  red_amount INTEGER NOT NULL CHECK (red_amount > 0),
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  uses_count INTEGER NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_red_gift_codes_creator ON room_red_gift_codes(creator_id);
