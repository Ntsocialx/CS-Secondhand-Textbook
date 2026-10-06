const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const email = String(process.env.TEST_STUDENT_EMAIL || '').trim().toLowerCase();
const password = process.env.TEST_STUDENT_PASSWORD;
const emailPattern = /^[^@\s]+@(?:student\.tut\.ac\.za|tut\.ac\.za|tut4life\.ac\.za)$/;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be configured before running the demo-user seed script.');
}
if (!emailPattern.test(email)) {
  throw new Error('Set TEST_STUDENT_EMAIL to an address using an approved TUT student email domain.');
}
if (!password || password.length < 12 || password.length > 128) {
  throw new Error('Set TEST_STUDENT_PASSWORD to a unique password between 12 and 128 characters.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users
      (email, password_hash, first_name, last_name, role, popia_consented_at, popia_consent_version)
     VALUES ($1, $2, 'Demo', 'Student', 'STUDENT', NOW(), '1.0')
     ON CONFLICT (email) DO NOTHING
     RETURNING id, email, role`,
    [email, passwordHash],
  );
  if (!result.rows[0]) {
    throw new Error('A student account already exists for this email; the seed did not overwrite it.');
  }
  console.log(`Created demo student ${result.rows[0].email} (${result.rows[0].role}).`);
  console.log('For an admin, register the account normally and use npm run admin:promote -- <registered-tut-email> from the server terminal.');
}

main()
  .catch((error) => {
    console.error('Demo student seed failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    pool.end().catch(() => undefined);
  });
