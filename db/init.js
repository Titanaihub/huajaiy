const { getPool } = require("./pool");

async function initDb() {
  const pool = getPool();
  if (!pool) {
    console.warn(
      "[db] DATABASE_URL ไม่ได้ตั้ง — ใช้ไฟล์ data/users.json สำหรับสมาชิก (ไม่แนะนำ production)"
    );
    return;
  }

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        username VARCHAR(32) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name VARCHAR(64) NOT NULL,
        last_name VARCHAR(64) NOT NULL,
        phone VARCHAR(16) NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'member',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'member';
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        total_price INTEGER NOT NULL DEFAULT 0,
        hearts_granted INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'demo_completed',
        items JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);`
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS shops (
        id UUID PRIMARY KEY,
        slug VARCHAR(64) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_shops_owner ON shops(owner_user_id);`
    );

    console.log(
      "[db] PostgreSQL schema พร้อม (users + role, orders, shops)"
    );
  } finally {
    client.release();
  }
}

module.exports = { initDb };
