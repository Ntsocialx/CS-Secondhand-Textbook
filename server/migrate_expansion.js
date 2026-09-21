const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log('Starting expansion migration...');
  try {
    // 1. Add category
    await pool.query(`ALTER TABLE listings ADD COLUMN IF NOT EXISTS category TEXT;`);
    
    // 2. Add trade support
    await pool.query(`ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_trade BOOLEAN NOT NULL DEFAULT FALSE;`);
    await pool.query(`ALTER TABLE listings ADD COLUMN IF NOT EXISTS trade_request TEXT;`);
    
    // 3. Make price nullable
    await pool.query(`ALTER TABLE listings ALTER COLUMN price DROP NOT NULL;`);
    
    console.log('Migration successful: Categories and Trade support added.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
