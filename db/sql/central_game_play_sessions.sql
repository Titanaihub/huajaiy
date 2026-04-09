-- สำรอง: รันใน PostgreSQL (Render) ถ้าต้องการสร้างตารางแยกจาก deploy โดยไม่รอ initDb
-- idempotent — รันซ้ำได้

CREATE TABLE IF NOT EXISTS central_game_play_sessions (
  id VARCHAR(64) PRIMARY KEY,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_proof VARCHAR(64) NOT NULL,
  state_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_central_game_play_sessions_updated ON central_game_play_sessions(updated_at);
