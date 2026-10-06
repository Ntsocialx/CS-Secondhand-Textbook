const { Pool } = require('pg');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
require('dotenv').config();

async function main() {
  const email = String(process.argv[2] || '').trim().toLowerCase();
  if (!/^[^@\s]+@(?:student\.tut\.ac\.za|tut\.ac\.za|tut4life\.ac\.za)$/.test(email)) {
    throw new Error('Usage: npm run admin:promote -- <registered-tut-email>');
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must be configured in the server environment.');
  if (!stdin.isTTY) throw new Error('Run this command from an interactive server terminal to confirm promotion.');

  const terminal = readline.createInterface({ input: stdin, output: stdout });
  const confirmation = await terminal.question(`Type PROMOTE ${email} to grant ADMIN access: `);
  terminal.close();
  if (confirmation !== `PROMOTE ${email}`) throw new Error('Confirmation did not match; no account was changed.');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  try {
    const result = await pool.query(
      `UPDATE users SET role = 'ADMIN'
       WHERE lower(email) = $1
       RETURNING id`,
      [email],
    );
    if (!result.rows[0]) throw new Error('No registered account found for that TUT email.');
    stdout.write('Admin role granted. Sign in through the normal Campus Exchange login using this account existing password.\n');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Admin promotion failed.');
  process.exitCode = 1;
});
