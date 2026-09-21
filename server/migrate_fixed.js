const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log('Starting migration...');
  try {
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS first_name TEXT,
      ADD COLUMN IF NOT EXISTS last_name TEXT,
      ADD COLUMN IF NOT EXISTS gender TEXT,
      ADD COLUMN IF NOT EXISTS campus TEXT,
      ADD COLUMN IF NOT EXISTS faculty TEXT,
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS contact_display_consent BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS popia_consented_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS popia_consent_version TEXT;
    `);
    console.log('Migration successful: Missing columns added to users table.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
