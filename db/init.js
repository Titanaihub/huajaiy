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
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS country_code VARCHAR(8) NOT NULL DEFAULT 'TH';
    `);
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS registration_ip VARCHAR(64);
    `);
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS gender VARCHAR(16);
    `);
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS birth_date DATE;
    `);
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS shipping_address TEXT;
    `);
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS shipping_house_no VARCHAR(200);
    `);
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS shipping_moo VARCHAR(200);
    `);
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS shipping_road VARCHAR(200);
    `);
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS shipping_subdistrict VARCHAR(200);
    `);
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS shipping_district VARCHAR(200);
    `);
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS shipping_province VARCHAR(200);
    `);
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS shipping_postal_code VARCHAR(20);
    `);
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS hearts_balance INTEGER NOT NULL DEFAULT 0;
    `);
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS pink_hearts_balance INTEGER NOT NULL DEFAULT 0;
    `);
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS red_hearts_balance INTEGER NOT NULL DEFAULT 0;
    `);
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS red_giveaway_balance INTEGER NOT NULL DEFAULT 0;
    `);
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS account_disabled BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS prize_contact_line VARCHAR(500);
    `);
    /* ย้ายยอดเก่า hearts_balance → หัวใจชมพู เมื่อยังไม่เคยแยกประเภท */
    await client.query(`
      UPDATE users SET pink_hearts_balance = GREATEST(0, COALESCE(hearts_balance, 0))
      WHERE COALESCE(pink_hearts_balance, 0) = 0
        AND COALESCE(red_hearts_balance, 0) = 0
        AND COALESCE(hearts_balance, 0) > 0;
    `);
    await client.query(`
      UPDATE users SET
        hearts_balance = COALESCE(pink_hearts_balance, 0) + COALESCE(red_hearts_balance, 0)
          + COALESCE(red_giveaway_balance, 0);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS heart_packages (
        id UUID PRIMARY KEY,
        title VARCHAR(160) NOT NULL,
        description TEXT,
        pink_qty INTEGER NOT NULL DEFAULT 0,
        red_qty INTEGER NOT NULL DEFAULT 0,
        price_thb INTEGER NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_heart_packages_active ON heart_packages(active) WHERE active = TRUE;`
    );
    await client.query(`
      ALTER TABLE heart_packages
      ADD COLUMN IF NOT EXISTS retired BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    await client.query(`
      ALTER TABLE heart_packages
      ADD COLUMN IF NOT EXISTS payment_account_name VARCHAR(200);
    `);
    await client.query(`
      ALTER TABLE heart_packages
      ADD COLUMN IF NOT EXISTS payment_account_number VARCHAR(64);
    `);
    await client.query(`
      ALTER TABLE heart_packages
      ADD COLUMN IF NOT EXISTS payment_bank_name VARCHAR(160);
    `);
    await client.query(`
      ALTER TABLE heart_packages
      ADD COLUMN IF NOT EXISTS payment_qr_url TEXT;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS heart_purchases (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        package_id UUID NOT NULL REFERENCES heart_packages(id) ON DELETE RESTRICT,
        pink_qty INTEGER NOT NULL DEFAULT 0,
        red_qty INTEGER NOT NULL DEFAULT 0,
        price_thb_snapshot INTEGER NOT NULL DEFAULT 0,
        slip_url TEXT NOT NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'pending',
        admin_note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMPTZ,
        resolved_by UUID REFERENCES users(id) ON DELETE SET NULL
      );
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_heart_purchases_pending ON heart_purchases(status) WHERE status = 'pending';`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_heart_purchases_user ON heart_purchases(user_id);`
    );
    await client.query(`
      ALTER TABLE heart_purchases
      ALTER COLUMN slip_url DROP NOT NULL;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS heart_ledger (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        pink_delta INTEGER NOT NULL,
        red_delta INTEGER NOT NULL,
        pink_balance_after INTEGER NOT NULL,
        red_balance_after INTEGER NOT NULL,
        kind VARCHAR(48) NOT NULL,
        label TEXT,
        meta JSONB
      );
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_heart_ledger_user_created ON heart_ledger(user_id, created_at DESC);`
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS name_change_requests (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        requested_first_name VARCHAR(64) NOT NULL,
        requested_last_name VARCHAR(64) NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMPTZ,
        resolver_note TEXT
      );
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_ncr_pending ON name_change_requests(status) WHERE status = 'pending';`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_ncr_user ON name_change_requests(user_id);`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`
    );
    try {
      await client.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users(phone);`
      );
    } catch (e) {
      console.warn(
        "[db] ไม่สามารถสร้าง unique index เบอร์โทรได้ (อาจมีเบอร์ซ้ำในระบบ):",
        e.message
      );
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_phone_history (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        old_phone VARCHAR(16) NOT NULL,
        new_phone VARCHAR(16) NOT NULL,
        changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        client_ip VARCHAR(64)
      );
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_user_phone_history_user ON user_phone_history(user_id, changed_at DESC);`
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY,
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        price_thb INTEGER NOT NULL DEFAULT 0,
        stock_qty INTEGER NOT NULL DEFAULT 0,
        category VARCHAR(64) NOT NULL DEFAULT '',
        image_url TEXT,
        hearts_bonus INTEGER NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT products_price_check CHECK (price_thb >= 0),
        CONSTRAINT products_stock_check CHECK (stock_qty >= 0)
      );
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id);`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_products_shop_active ON products(shop_id) WHERE active = TRUE;`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category) WHERE active = TRUE;`
    );

    await client.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS shipping_snapshot TEXT;
    `);
    await client.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS order_kind VARCHAR(24) NOT NULL DEFAULT 'legacy';
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS central_games (
        id UUID PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        tile_count INTEGER NOT NULL,
        set_count INTEGER NOT NULL,
        images_per_set INTEGER NOT NULL,
        heart_cost INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT FALSE,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT central_games_dims_check CHECK (
          tile_count > 0 AND set_count > 0 AND images_per_set > 0
          AND tile_count = set_count * images_per_set
        )
      );
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_central_games_one_active
      ON central_games (is_active) WHERE (is_active = TRUE);
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS central_game_images (
        game_id UUID NOT NULL REFERENCES central_games(id) ON DELETE CASCADE,
        set_index INTEGER NOT NULL,
        image_index INTEGER NOT NULL,
        image_url TEXT NOT NULL,
        PRIMARY KEY (game_id, set_index, image_index)
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS central_game_rules (
        id UUID PRIMARY KEY,
        game_id UUID NOT NULL REFERENCES central_games(id) ON DELETE CASCADE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        set_index INTEGER NOT NULL,
        need_count INTEGER NOT NULL,
        prize_category VARCHAR(16) NOT NULL,
        prize_title VARCHAR(200),
        prize_value_text VARCHAR(200),
        prize_unit VARCHAR(32),
        description TEXT
      );
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_central_rules_game ON central_game_rules(game_id);`
    );

    await client.query(`
      ALTER TABLE central_games
      ADD COLUMN IF NOT EXISTS pink_heart_cost INTEGER NOT NULL DEFAULT 0;
    `);
    await client.query(`
      ALTER TABLE central_games
      ADD COLUMN IF NOT EXISTS red_heart_cost INTEGER NOT NULL DEFAULT 0;
    `);
    await client.query(`
      UPDATE central_games
      SET pink_heart_cost = GREATEST(0, COALESCE(heart_cost, 0))
      WHERE pink_heart_cost = 0 AND red_heart_cost = 0 AND COALESCE(heart_cost, 0) > 0;
    `);
    await client.query(`
      UPDATE central_games
      SET heart_cost = pink_heart_cost + red_heart_cost
      WHERE heart_cost IS DISTINCT FROM (pink_heart_cost + red_heart_cost);
    `);

    await client.query(`
      ALTER TABLE central_games
      ADD COLUMN IF NOT EXISTS set_image_counts JSONB;
    `);
    await client.query(`
      UPDATE central_games g
      SET set_image_counts = to_jsonb(
        ARRAY(SELECT g.images_per_set FROM generate_series(1, g.set_count) AS s(i))
      )
      WHERE g.set_image_counts IS NULL AND g.set_count > 0;
    `);
    await client.query(`
      ALTER TABLE central_games DROP CONSTRAINT IF EXISTS central_games_dims_check;
    `);
    await client.query(`
      ALTER TABLE central_games DROP CONSTRAINT IF EXISTS central_games_basic_check;
    `);
    await client.query(`
      ALTER TABLE central_games
      ADD CONSTRAINT central_games_basic_check CHECK (
        tile_count > 0 AND set_count > 0 AND images_per_set > 0
      );
    `);

    await client.query(`
      ALTER TABLE central_games
      ADD COLUMN IF NOT EXISTS tile_back_cover_url TEXT;
    `);

    await client.query(`
      ALTER TABLE central_games
      ADD COLUMN IF NOT EXISTS description TEXT;
    `);

    await client.query(`
      ALTER TABLE central_games
      ADD COLUMN IF NOT EXISTS game_cover_url TEXT;
    `);

    await client.query(`
      ALTER TABLE central_games
      ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    await client.query(`
      UPDATE central_games SET is_published = TRUE WHERE is_active = TRUE AND is_published = FALSE;
    `);

    await client.query(`
      ALTER TABLE central_games
      ADD COLUMN IF NOT EXISTS game_code VARCHAR(32);
    `);
    await client.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_central_games_game_code_unique ON central_games (game_code);`
    );

    await client.query(`
      ALTER TABLE central_game_rules
      ADD COLUMN IF NOT EXISTS prize_total_qty INTEGER NOT NULL DEFAULT 1;
    `);
    await client.query(`
      ALTER TABLE central_game_rules
      ALTER COLUMN prize_total_qty DROP NOT NULL;
    `);
    await client.query(`
      UPDATE central_game_rules
      SET prize_total_qty = NULL
      WHERE prize_category = 'none';
    `);

    await client.query(`
      ALTER TABLE central_game_rules
      ADD COLUMN IF NOT EXISTS prize_fulfillment_mode VARCHAR(16);
    `);
    await client.query(`
      UPDATE central_game_rules
      SET prize_fulfillment_mode = CASE
        WHEN prize_category = 'cash' THEN 'transfer'
        WHEN prize_category = 'item' THEN 'ship'
        ELSE NULL
      END
      WHERE prize_fulfillment_mode IS NULL;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS central_prize_awards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id UUID NOT NULL REFERENCES central_games(id) ON DELETE CASCADE,
        rule_id UUID NOT NULL REFERENCES central_game_rules(id) ON DELETE CASCADE,
        winner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        play_session_id VARCHAR(64) NOT NULL,
        prize_category VARCHAR(16) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'recorded',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT central_prize_awards_play_session_unique UNIQUE (play_session_id)
      );
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_central_prize_awards_game ON central_prize_awards(game_id);`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_central_prize_awards_rule ON central_prize_awards(rule_id);`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_central_prize_awards_winner ON central_prize_awards(winner_user_id);`
    );

    /** สำเนาข้อมูลกติกา/ชื่อเกมตอนชนะ — กันลบประวัติเมื่อแอดมินแทนที่กติกา (เดิม CASCADE จาก rule_id) */
    await client.query(`
      ALTER TABLE central_prize_awards
      ADD COLUMN IF NOT EXISTS rule_set_index INTEGER;
    `);
    await client.query(`
      ALTER TABLE central_prize_awards
      ADD COLUMN IF NOT EXISTS rule_prize_title VARCHAR(200);
    `);
    await client.query(`
      ALTER TABLE central_prize_awards
      ADD COLUMN IF NOT EXISTS rule_prize_value_text VARCHAR(200);
    `);
    await client.query(`
      ALTER TABLE central_prize_awards
      ADD COLUMN IF NOT EXISTS rule_prize_unit VARCHAR(32);
    `);
    await client.query(`
      ALTER TABLE central_prize_awards
      ADD COLUMN IF NOT EXISTS game_title_at_win TEXT;
    `);
    await client.query(`
      ALTER TABLE central_prize_awards
      ADD COLUMN IF NOT EXISTS item_fulfillment_mode VARCHAR(16);
    `);
    await client.query(`
      ALTER TABLE central_prize_awards
      ADD COLUMN IF NOT EXISTS item_fulfillment_status VARCHAR(24) NOT NULL DEFAULT 'pending_creator';
    `);
    await client.query(`
      ALTER TABLE central_prize_awards
      ADD COLUMN IF NOT EXISTS item_fulfillment_note TEXT;
    `);
    await client.query(`
      ALTER TABLE central_prize_awards
      ADD COLUMN IF NOT EXISTS item_tracking_code VARCHAR(120);
    `);
    await client.query(`
      ALTER TABLE central_prize_awards
      ADD COLUMN IF NOT EXISTS item_shipping_address_snapshot JSONB;
    `);
    await client.query(`
      ALTER TABLE central_prize_awards
      ADD COLUMN IF NOT EXISTS item_resolved_at TIMESTAMPTZ;
    `);
    await client.query(`
      ALTER TABLE central_prize_awards
      ADD COLUMN IF NOT EXISTS prize_fulfillment_mode VARCHAR(16);
    `);
    await client.query(`
      UPDATE central_prize_awards a
      SET prize_fulfillment_mode = CASE
        WHEN a.prize_category = 'item' AND NULLIF(TRIM(COALESCE(a.item_fulfillment_mode, '')), '') IS NOT NULL
          THEN LOWER(TRIM(a.item_fulfillment_mode))
        WHEN a.prize_category = 'item' THEN 'ship'
        WHEN a.prize_category = 'cash' THEN 'transfer'
        ELSE NULL
      END
      WHERE a.prize_fulfillment_mode IS NULL;
    `);
    await client.query(`
      ALTER TABLE central_prize_awards
      ADD COLUMN IF NOT EXISTS winner_pickup_ack_at TIMESTAMPTZ;
    `);
    await client.query(`
      UPDATE central_prize_awards a
      SET
        rule_set_index = r.set_index,
        rule_prize_title = r.prize_title,
        rule_prize_value_text = r.prize_value_text,
        rule_prize_unit = r.prize_unit,
        game_title_at_win = g.title
      FROM central_game_rules r, central_games g
      WHERE a.rule_id = r.id AND a.game_id = g.id
        AND a.rule_set_index IS NULL;
    `);
    await client.query(
      `ALTER TABLE central_prize_awards DROP CONSTRAINT IF EXISTS central_prize_awards_rule_id_fkey;`
    );
    await client.query(
      `ALTER TABLE central_prize_awards ALTER COLUMN rule_id DROP NOT NULL;`
    );
    await client.query(`
      ALTER TABLE central_prize_awards
      ADD CONSTRAINT central_prize_awards_rule_id_fkey
      FOREIGN KEY (rule_id) REFERENCES central_game_rules(id) ON DELETE SET NULL;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS central_prize_withdrawal_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requester_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        creator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount_thb INTEGER NOT NULL CHECK (amount_thb > 0),
        account_holder_name TEXT NOT NULL,
        account_number TEXT NOT NULL,
        bank_name TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'rejected')),
        creator_note TEXT,
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_cpwr_creator_pending
       ON central_prize_withdrawal_requests(creator_user_id)
       WHERE status = 'pending';`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_cpwr_requester ON central_prize_withdrawal_requests(requester_user_id);`
    );
    await client.query(
      `ALTER TABLE central_prize_withdrawal_requests ADD COLUMN IF NOT EXISTS transfer_slip_url TEXT;`
    );
    await client.query(`
      ALTER TABLE central_prize_withdrawal_requests
      ADD COLUMN IF NOT EXISTS transfer_date DATE;
    `);
    await client.query(`
      ALTER TABLE central_prize_withdrawal_requests
      DROP CONSTRAINT IF EXISTS central_prize_withdrawal_requests_status_check;
    `);
    await client.query(`
      ALTER TABLE central_prize_withdrawal_requests
      ADD CONSTRAINT central_prize_withdrawal_requests_status_check
      CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));
    `);

    await client.query(`
      ALTER TABLE central_games
      ADD COLUMN IF NOT EXISTS allow_gift_red_play BOOLEAN NOT NULL DEFAULT FALSE;
    `);

    await client.query(`
      ALTER TABLE central_games
      ADD COLUMN IF NOT EXISTS heart_currency_mode VARCHAR(16) NOT NULL DEFAULT 'both';
    `);
    await client.query(`
      ALTER TABLE central_games
      ADD COLUMN IF NOT EXISTS accepts_pink_hearts BOOLEAN NOT NULL DEFAULT TRUE;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_room_red_balance (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, creator_id)
      );
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_user_room_red_balance_creator ON user_room_red_balance(creator_id);`
    );

    await client.query(`
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
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_room_red_gift_codes_creator ON room_red_gift_codes(creator_id);`
    );
    await client.query(`
      ALTER TABLE room_red_gift_codes
      ADD COLUMN IF NOT EXISTS funded_giveaway INTEGER NOT NULL DEFAULT 0;
    `);
    await client.query(`
      ALTER TABLE room_red_gift_codes
      ADD COLUMN IF NOT EXISTS funded_playable INTEGER NOT NULL DEFAULT 0;
    `);
    await client.query(`
      ALTER TABLE room_red_gift_codes
      ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS room_red_gift_redemptions (
        id UUID PRIMARY KEY,
        code_id UUID NOT NULL REFERENCES room_red_gift_codes(id) ON DELETE CASCADE,
        creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        redeemer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        red_amount INTEGER NOT NULL CHECK (red_amount > 0),
        redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_room_red_gift_redemptions_creator ON room_red_gift_redemptions(creator_id, redeemed_at DESC);`
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_room_red_gift_redemptions_code ON room_red_gift_redemptions(code_id, redeemed_at DESC);`
    );
    /* รหัสเก่า (ก่อนมีคอลัมน์ทุน) ถือว่าหักจากแดงเล่นได้ทั้งหมด — คืนยอดสอดคล้องเดิม */
    await client.query(`
      UPDATE room_red_gift_codes
      SET funded_playable = red_amount * max_uses,
          funded_giveaway = 0
      WHERE funded_playable = 0 AND funded_giveaway = 0
        AND red_amount > 0 AND max_uses > 0;
    `);

    console.log(
      "[db] PostgreSQL schema พร้อม (users, orders, shops, products, hearts, central_games)"
    );
  } finally {
    client.release();
  }
}

module.exports = { initDb };
