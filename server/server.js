const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const { validateExchangeInput, validateReportInput } = require('./lib/marketplace-validation');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const POPIA_CONSENT_VERSION = '1.0';
const LISTING_POLICY_VERSION = '2026-09';
const LISTING_REVIEW_CHECKLIST_ITEMS = 5;
const LISTING_FEE_CENTS = 500;
const isValidListingId = (id) => /^[1-9]\d{0,17}$/.test(String(id));
const MAX_PAYMENT_PROOF_BYTES = 5 * 1024 * 1024;
const PASSWORD_RESET_TOKEN_TTL_MINUTES = 30;
const PASSWORD_RESET_REQUESTS_PER_EMAIL_HOUR = 3;
const PASSWORD_RESET_REQUESTS_PER_IP_HOUR = 10;
const PASSWORD_RESET_COMPLETIONS_PER_IP_HOUR = 20;
const ALLOWED_EMAIL_DOMAINS = ['student.tut.ac.za', 'tut.ac.za', 'tut4life.ac.za'];
const LOGIN_FAILURE_LIMIT = 5;
const LOGIN_LOCKOUT_MS = 5 * 60 * 1000;
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' || process.env.DATABASE_URL.includes('neon.tech')
        ? { rejectUnauthorized: false }
        : false,
    })
  : null;

// Middleware
app.use(cors());
app.use(express.json({ limit: '8mb' }));

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.set('Retry-After', String(Math.ceil((15 * 60 * 1000) / 1000)));
    res.status(429).json({ error: 'Too many authentication attempts. Please try again in about 15 minutes.' });
  },
});

const requireConfiguration = (res) => {
  if (!pool || !JWT_SECRET) {
    res.status(503).json({ error: 'The authentication service is not configured.' });
    return false;
  }
  return true;
};

const isAllowedStudentEmail = (email) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)
    && ALLOWED_EMAIL_DOMAINS.some((domain) => normalizedEmail.endsWith(`@${domain}`));
};

const hasRequiredConsent = (consent) =>
  consent
  && consent.accepted === true
  && consent.version === POPIA_CONSENT_VERSION;

const getLoginAttemptKey = (req, email) => `${req.ip}:${email}`;

const getLoginLockout = async (req, email) => {
  const result = await pool.query(
    `SELECT failed_attempts, locked_until FROM login_attempts WHERE attempt_key = $1`,
    [getLoginAttemptKey(req, email)],
  );
  const attempt = result.rows[0];
  if (!attempt) return null;
  const lockedUntil = attempt.locked_until ? new Date(attempt.locked_until).getTime() : 0;
  if (lockedUntil > Date.now()) return lockedUntil;
  if (lockedUntil) {
    await pool.query('DELETE FROM login_attempts WHERE attempt_key = $1', [getLoginAttemptKey(req, email)]);
  }
  return null;
};

const recordFailedLogin = async (req, email) => {
  const attemptKey = getLoginAttemptKey(req, email);
  await pool.query(
    `INSERT INTO login_attempts (attempt_key, failed_attempts, locked_until)
     VALUES ($1, 1, NULL)
     ON CONFLICT (attempt_key) DO UPDATE
     SET failed_attempts = login_attempts.failed_attempts + 1,
         locked_until = CASE
           WHEN login_attempts.failed_attempts + 1 >= $2 THEN NOW() + ($3 * INTERVAL '1 millisecond')
           ELSE login_attempts.locked_until
         END,
         updated_at = NOW()`,
    [attemptKey, LOGIN_FAILURE_LIMIT, LOGIN_LOCKOUT_MS],
  );
};

const clearFailedLogins = async (req, email) => {
  await pool.query('DELETE FROM login_attempts WHERE attempt_key = $1', [getLoginAttemptKey(req, email)]);
};

const hashVisitorIp = (req) => crypto
  .createHash('sha256')
  .update(`${req.ip}:${process.env.VISITOR_HASH_SALT || 'campus-exchange'}`)
  .digest('hex');

const createAccessToken = (user) => jwt.sign(
  { sub: user.id, email: user.email, role: user.role, passwordVersion: Number(user.password_version || 0) },
  JWT_SECRET,
  { expiresIn: '8h' },
);

const authenticate = async (req, res, next) => {
  if (!JWT_SECRET) {
    return res.status(503).json({ error: 'The authentication service is not configured.' });
  }
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    if (!pool) return res.status(503).json({ error: 'The authentication service is not configured.' });
    const result = await pool.query('SELECT password_version FROM users WHERE id = $1', [req.user.sub]);
    if (!result.rows[0] || Number(result.rows[0].password_version) !== Number(req.user.passwordVersion || 0)) {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }
    console.error('Session verification failed:', error);
    return res.status(503).json({ error: 'Unable to verify the session.' });
  }
};

const requireAdmin = async (req, res, next) => {
  if (!pool) return res.status(503).json({ error: 'Admin storage is not configured.' });
  try {
    const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.sub]);
    if (!result.rows[0]) return res.status(401).json({ error: 'Account not found.' });
    if (result.rows[0].role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required.' });
    req.user.role = 'ADMIN';
    return next();
  } catch (error) {
    console.error('Admin authorization failed:', error);
    return res.status(500).json({ error: 'Unable to verify admin access.' });
  }
};

const getPaymentInstructions = () => {
  const account = {
    accountHolder: process.env.LISTING_PAYMENT_ACCOUNT_HOLDER,
    bank: process.env.LISTING_PAYMENT_BANK,
    accountNumber: process.env.LISTING_PAYMENT_ACCOUNT_NUMBER,
    accountType: process.env.LISTING_PAYMENT_ACCOUNT_TYPE,
  };
  if (Object.values(account).some((value) => !value || !value.trim())) return null;
  return { fee: (LISTING_FEE_CENTS / 100).toFixed(2), currency: 'ZAR', periodDays: 30, ...account };
};

const getPaymentProofFile = (dataUrl) => {
  if (typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:(image\/jpeg|image\/png|application\/pdf);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) return null;
  const data = Buffer.from(match[2], 'base64');
  if (!data.length || data.length > MAX_PAYMENT_PROOF_BYTES) return null;
  const signatures = {
    'image/jpeg': data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff,
    'image/png': data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    'application/pdf': data.subarray(0, 5).toString('ascii') === '%PDF-',
  };
  if (!signatures[match[1]]) return null;
  return { mimeType: match[1], data };
};

const hashResetValue = (value) => crypto.createHash('sha256').update(value).digest('hex');
const hashResetRateKey = (value) => crypto
  .createHmac('sha256', process.env.PASSWORD_RESET_HASH_SECRET || JWT_SECRET || 'unconfigured-reset-secret')
  .update(value)
  .digest('hex');

const getPasswordResetMailer = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  const port = Number(SMTP_PORT);
  if (!SMTP_HOST || !Number.isInteger(port) || port < 1 || port > 65535
      || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
};

const getPasswordResetBaseUrl = () => {
  const configuredUrl = process.env.PASSWORD_RESET_BASE_URL;
  if (!configuredUrl) return null;
  try {
    const url = new URL(configuredUrl);
    const isLocalHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
    if (url.protocol !== 'https:' && !isLocalHttp) return null;
    return url.origin;
  } catch {
    return null;
  }
};

const passwordResetMessage = 'If an account exists for that email, password reset instructions will be sent shortly.';

app.post('/api/auth/register', authRateLimiter, async (req, res) => {
  if (!requireConfiguration(res)) return;
  const { email, password, phone, firstName, lastName, gender, campus, faculty, consent } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!isAllowedStudentEmail(normalizedEmail)) {
    return res.status(400).json({ error: 'Use a verified student email domain.' });
  }
  if (!firstName || !lastName) {
    return res.status(400).json({ error: 'First name and surname are required.' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must contain at least 8 characters.' });
  }
  if (!hasRequiredConsent(consent)) {
    return res.status(400).json({ error: 'POPIA consent is required before registration.' });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users
        (email, password_hash, first_name, last_name, gender, campus, faculty, phone, contact_display_consent, popia_consented_at, popia_consent_version, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, 'STUDENT')
       RETURNING id, email, phone, contact_display_consent, role, popia_consented_at, popia_consent_version`,
      [normalizedEmail, passwordHash, firstName, lastName, gender || null, campus || null, faculty || null, phone || null, consent.displayContactDetails === true, POPIA_CONSENT_VERSION],
    );
    const user = result.rows[0];
    return res.status(201).json({ user, accessToken: createAccessToken(user) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'An account already exists for this email.' });
    console.error('Registration failed:', error);
    return res.status(500).json({ error: 'Unable to create the account.' });
  }
});

app.post('/api/auth/password-reset/request', async (req, res) => {
  if (!pool || !JWT_SECRET) {
    return res.status(503).json({ error: 'Password reset is temporarily unavailable. Please try again later.' });
  }
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(202).json({ message: passwordResetMessage });
  }
  const baseUrl = getPasswordResetBaseUrl();
  const mailer = getPasswordResetMailer();
  if (!baseUrl || !mailer || (process.env.PASSWORD_RESET_HASH_SECRET || '').length < 32) {
    console.error('Password reset unavailable: canonical URL, SMTP, or reset hash secret is not configured.');
    return res.status(503).json({ error: 'Password reset is temporarily unavailable. Please try again later.' });
  }
  const emailKey = hashResetRateKey(email);
  const ipKey = hashResetRateKey(String(req.ip || 'unknown'));
  const token = crypto.randomBytes(32).toString('hex');
  try {
    const client = await pool.connect();
    let user;
    try {
      await client.query('BEGIN');
      const lockKeys = [emailKey, ipKey].sort();
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1)), pg_advisory_xact_lock(hashtext($2))', lockKeys);
      await client.query(
        `DELETE FROM password_reset_tokens
         WHERE expires_at < NOW() - INTERVAL '7 days'
            OR consumed_at < NOW() - INTERVAL '7 days'`,
      );
      await client.query(`DELETE FROM password_reset_requests WHERE created_at < NOW() - INTERVAL '2 days'`);
      await client.query(`DELETE FROM password_reset_attempts WHERE created_at < NOW() - INTERVAL '2 days'`);
      const rate = await client.query(
        `SELECT COUNT(*) FILTER (WHERE email_key = $1)::int AS email_count,
                COUNT(*) FILTER (WHERE ip_key = $2)::int AS ip_count
         FROM password_reset_requests
         WHERE created_at >= NOW() - INTERVAL '1 hour'`,
        [emailKey, ipKey],
      );
      const limited = rate.rows[0].email_count >= PASSWORD_RESET_REQUESTS_PER_EMAIL_HOUR
        || rate.rows[0].ip_count >= PASSWORD_RESET_REQUESTS_PER_IP_HOUR;
      await client.query(
        `INSERT INTO password_reset_requests (email_key, ip_key)
         VALUES ($1, $2)`,
        [emailKey, ipKey],
      );
      if (!limited) {
        const userResult = await client.query(`SELECT id, email FROM users WHERE email = $1`, [email]);
        user = userResult.rows[0];
        if (user) {
          await client.query(
            `UPDATE password_reset_tokens SET consumed_at = NOW()
             WHERE user_id = $1 AND consumed_at IS NULL`,
            [user.id],
          );
          await client.query(
            `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 minute'))`,
            [user.id, hashResetValue(token), PASSWORD_RESET_TOKEN_TTL_MINUTES],
          );
        }
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    if (user) {
      const resetUrl = new URL('/reset-password', baseUrl);
      resetUrl.searchParams.set('token', token);
      setImmediate(() => {
        Promise.resolve().then(() => mailer.sendMail({
            from: process.env.SMTP_FROM,
            to: user.email,
            subject: 'Reset your Campus Exchange password',
            text: `A password reset was requested for your Campus Exchange account. Open this link within ${PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes to choose a new password: ${resetUrl.toString()}\n\nIf you did not request this, ignore this email. Your password will not change.`,
            html: `<p>A password reset was requested for your Campus Exchange account.</p><p><a href="${resetUrl.toString()}">Choose a new password</a></p><p>This link expires in ${PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes and can only be used once.</p><p>If you did not request this, ignore this email. Your password will not change.</p>`,
          })).catch(() => {
          console.error('Password reset email delivery failed; reset token invalidation queued.');
          pool.query(
            `UPDATE password_reset_tokens SET consumed_at = NOW()
             WHERE token_hash = $1 AND consumed_at IS NULL`,
            [hashResetValue(token)],
          ).catch(() => console.error('Unable to invalidate undelivered password reset token.'));
        });
      });
    }
    return res.status(202).json({ message: passwordResetMessage });
  } catch (error) {
    console.error('Password reset request failed.');
    return res.status(503).json({ error: 'Password reset is temporarily unavailable. Please try again later.' });
  }
});

app.post('/api/auth/password-reset/complete', async (req, res) => {
  if (!pool || !JWT_SECRET) {
    return res.status(503).json({ error: 'Password reset is temporarily unavailable. Please try again later.' });
  }
  const { token, password } = req.body || {};
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)
      || typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'The reset link or new password is invalid.' });
  }
  const ipKey = hashResetRateKey(String(req.ip || 'unknown'));
  const rateClient = await pool.connect();
  try {
    await rateClient.query('BEGIN');
    await rateClient.query('SELECT pg_advisory_xact_lock(hashtext($1))', [ipKey]);
    const recentAttempts = await rateClient.query(
      `SELECT COUNT(*)::int AS attempts FROM password_reset_attempts
       WHERE ip_key = $1 AND created_at >= NOW() - INTERVAL '1 hour'`,
      [ipKey],
    );
    await rateClient.query('INSERT INTO password_reset_attempts (ip_key) VALUES ($1)', [ipKey]);
    if (recentAttempts.rows[0].attempts >= PASSWORD_RESET_COMPLETIONS_PER_IP_HOUR) {
      await rateClient.query('COMMIT');
      return res.status(429).json({ error: 'Too many reset attempts. Request a new link later.' });
    }
    await rateClient.query('COMMIT');
  } catch (error) {
    await rateClient.query('ROLLBACK');
    console.error('Password reset rate check failed.');
    return res.status(503).json({ error: 'Password reset is temporarily unavailable. Please try again later.' });
  } finally {
    rateClient.release();
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tokenResult = await client.query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [hashResetValue(token)],
    );
    if (!tokenResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This reset link is invalid, expired, or already used. Request a new link.' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await client.query(
      `UPDATE users SET password_hash = $1, password_version = password_version + 1
       WHERE id = $2`,
      [passwordHash, tokenResult.rows[0].user_id],
    );
    await client.query(
      `UPDATE password_reset_tokens SET consumed_at = NOW()
       WHERE user_id = $1 AND consumed_at IS NULL`,
      [tokenResult.rows[0].user_id],
    );
    const userResult = await client.query('SELECT email FROM users WHERE id = $1', [tokenResult.rows[0].user_id]);
    await client.query(
      `DELETE FROM login_attempts WHERE right(attempt_key, length($1)) = $1`,
      [userResult.rows[0].email],
    );
    await client.query('COMMIT');
    return res.json({ message: 'Password updated. Sign in with your new password.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Password reset completion failed.');
    return res.status(500).json({ error: 'Unable to update the password. Request a new reset link and try again.' });
  } finally {
    client.release();
  }
});

app.post('/api/auth/login', authRateLimiter, async (req, res) => {
  if (!requireConfiguration(res)) return;
  const { email, password, consent } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!isAllowedStudentEmail(normalizedEmail)) {
    return res.status(400).json({ error: 'Use a verified student email domain.' });
  }
  if (!hasRequiredConsent(consent)) {
    return res.status(400).json({ error: 'POPIA consent is required before login.' });
  }
  const lockedUntil = await getLoginLockout(req, normalizedEmail);
  if (lockedUntil) {
    const retryAfter = Math.ceil((lockedUntil - Date.now()) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Too many failed login attempts. Try again in about 5 minutes.' });
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(String(password || ''), user.password_hash))) {
      await recordFailedLogin(req, normalizedEmail);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    await clearFailedLogins(req, normalizedEmail);
    await pool.query(
      `UPDATE users
       SET contact_display_consent = $1, popia_consented_at = NOW(), popia_consent_version = $2
       WHERE id = $3`,
      [consent.displayContactDetails === true, POPIA_CONSENT_VERSION, user.id],
    );
    return res.json({
      user: { id: user.id, email: user.email, phone: user.phone, role: user.role, firstName: user.first_name, lastName: user.last_name },
      accessToken: createAccessToken(user),
    });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({ error: 'Unable to sign in.' });
  }
});

const CONDITIONS = new Set(['Like New', 'Good', 'Acceptable', 'Worn']);
const normalizeListing = (body) => ({
  title: String(body?.title || '').trim().slice(0, 200),
  courseCode: String(body?.courseCode || '').trim().toUpperCase().slice(0, 30),
  price: body?.price !== undefined ? Number(body.price) : null,
  condition: String(body?.condition || '').trim(),
  description: String(body?.description || '').trim().slice(0, 2000),
  campus: String(body?.campus || '').trim().slice(0, 120),
  imageUrl: typeof body?.imageUrl === 'string' ? body.imageUrl.slice(0, 2_000_000) : null,
  category: String(body?.category || 'Textbook').trim().slice(0, 100),
  isTrade: Boolean(body?.isTrade),
  tradeRequest: String(body?.tradeRequest || '').trim().slice(0, 2000),
});

const validateListing = (listing) => {
  if (!listing.title || !listing.courseCode || !listing.campus || !listing.description) return 'Title, course code, campus, and description are required.';
  if (!['Textbook', 'Bible', 'Comic Book', 'Manga'].includes(listing.category)) return 'Please choose a valid category.';
  if (!listing.isTrade) {
    if (!Number.isFinite(listing.price) || listing.price < 0 || listing.price > 100000) return 'Price must be a valid amount between R0 and R100000.';
  } else {
    if (!listing.tradeRequest || listing.tradeRequest.trim().length < 5) return 'Please provide a valid trade request (at least 5 characters).';
  }
  if (!CONDITIONS.has(listing.condition)) return 'Choose a valid book condition.';
  if (listing.imageUrl && !/^https?:\/\/|^\/|^data:image\/(png|jpe?g|webp);base64,/.test(listing.imageUrl)) return 'The textbook image format is not supported.';
  return null;
};

app.get('/api/listing-payment-instructions', authenticate, (req, res) => {
  if (!requireConfiguration(res)) return;
  const instructions = getPaymentInstructions();
  if (!instructions) {
    return res.status(503).json({ error: 'Listing payment instructions are not configured yet. Please contact the marketplace administrator.' });
  }
  return res.json({ instructions });
});

app.get('/api/public/listings', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Listing storage is not configured.' });
  try {
    const result = await pool.query(
      `SELECT id, title, course_code AS "courseCode", price::text, condition, campus,
              image_url AS "imageUrl", category, is_trade AS "isTrade",
              trade_request AS "tradeRequest", created_at AS "createdAt"
       FROM listings WHERE status = 'ACTIVE' AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC LIMIT 6`,
    );
    return res.json({ listings: result.rows });
  } catch (error) {
    console.error('Public listing preview failed:', error);
    return res.status(500).json({ error: 'Unable to load approved listings.' });
  }
});

app.get('/api/listings', authenticate, async (req, res) => {
  if (!requireConfiguration(res)) return;
  for (const key of ['minPrice', 'maxPrice']) {
    if (req.query[key] !== undefined
        && (!/^\d+(\.\d{1,2})?$/.test(String(req.query[key]))
          || !Number.isFinite(Number(req.query[key]))
          || Number(req.query[key]) > 100000)) {
      return res.status(400).json({ error: `${key} must be a valid Rand amount.` });
    }
  }
  if (req.query.minPrice !== undefined && req.query.maxPrice !== undefined
      && Number(req.query.minPrice) > Number(req.query.maxPrice)) {
    return res.status(400).json({ error: 'Minimum price cannot be greater than maximum price.' });
  }
  const values = [];
  const filters = ["status = 'ACTIVE'", "(expires_at IS NULL OR expires_at > NOW())"];
  if (req.query.q) {
    values.push(`%${String(req.query.q).trim().slice(0, 100)}%`);
    filters.push(`(title ILIKE $${values.length} OR course_code ILIKE $${values.length} OR description ILIKE $${values.length})`);
  }
  if (req.query.category) {
    values.push(String(req.query.category).trim());
    filters.push(`category = $${values.length}`);
  }
  if (req.query.courseCode) {
    values.push(String(req.query.courseCode).trim().toUpperCase());
    filters.push(`course_code = $${values.length}`);
  }
  if (req.query.campus) {
    values.push(String(req.query.campus).trim());
    filters.push(`campus = $${values.length}`);
  }
  if (req.query.condition) {
    values.push(String(req.query.condition).trim());
    filters.push(`condition = $${values.length}`);
  }
  if (req.query.isTrade === 'true' || req.query.isTrade === 'false') {
    values.push(req.query.isTrade === 'true');
    filters.push(`is_trade = $${values.length}`);
  }
  if (req.query.minPrice !== undefined && /^\d+(\.\d{1,2})?$/.test(String(req.query.minPrice))) {
    values.push(Number(req.query.minPrice));
    filters.push(`price >= $${values.length}`);
  }
  if (req.query.maxPrice !== undefined && /^\d+(\.\d{1,2})?$/.test(String(req.query.maxPrice))) {
    values.push(Number(req.query.maxPrice));
    filters.push(`price <= $${values.length}`);
  }
  const orderBy = {
    newest: 'created_at DESC',
    price_asc: 'price ASC NULLS LAST',
    price_desc: 'price DESC NULLS LAST',
  }[String(req.query.sort || 'newest')] || 'created_at DESC';
  try {
    const result = await pool.query(
      `SELECT id, title, course_code AS "courseCode", price::text, condition, description, campus,
              image_url AS "imageUrl", status, created_at AS "createdAt", user_id AS "userId", category, is_trade AS "isTrade", trade_request AS "tradeRequest"
       FROM listings WHERE ${filters.join(' AND ')} ORDER BY ${orderBy}`,
      values,
    );
    return res.json({ listings: result.rows });
  } catch (error) {
    console.error('Listing search failed:', error);
    return res.status(500).json({ error: 'Unable to load listings.' });
  }
});

app.get('/api/listings/:id/contact', authenticate, async (req, res) => {
  if (!requireConfiguration(res)) return;
  if (!isValidListingId(req.params.id)) return res.status(400).json({ error: 'Listing ID is invalid.' });
  try {
    const result = await pool.query(
      `SELECT u.email, u.phone, u.first_name AS "firstName", u.last_name AS "lastName", u.contact_display_consent
       FROM listings l JOIN users u ON u.id = l.user_id
       WHERE l.id = $1 AND l.status = 'ACTIVE' AND (l.expires_at IS NULL OR l.expires_at > NOW())`,
      [req.params.id],
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Listing not found.' });
    const seller = result.rows[0];
    if (!seller.contact_display_consent) {
      return res.status(403).json({ error: 'Seller has disabled contact display.' });
    }
    await pool.query(
      `INSERT INTO listing_review_events (listing_id, actor_id, event_type, decision)
       VALUES ($1, $2, 'CONTACT_REVEAL', 'REVEALED')`,
      [req.params.id, req.user.sub],
    );
    return res.json({
      contact: {
        email: seller.email,
        phone: seller.phone,
        firstName: seller.firstName,
        lastName: seller.lastName,
      },
    });
  } catch (error) {
    console.error('Contact reveal failed:', error);
    return res.status(500).json({ error: 'Unable to retrieve contact details.' });
  }
});

app.get('/api/listings/:id', authenticate, async (req, res) => {

  if (!requireConfiguration(res)) return;
  if (!isValidListingId(req.params.id)) return res.status(400).json({ error: 'Listing ID is invalid.' });
  try {
    const result = await pool.query(
      `SELECT l.id, l.title, l.course_code AS "courseCode", l.price::text, l.condition, l.description,
              l.campus, l.image_url AS "imageUrl", l.status, l.created_at AS "createdAt",
              l.category, l.is_trade AS "isTrade", l.trade_request AS "tradeRequest"
       FROM listings l
       WHERE l.id = $1 AND l.status = 'ACTIVE' AND (l.expires_at IS NULL OR l.expires_at > NOW())`,
      [req.params.id],
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Listing not found.' });
    return res.json({ listing: result.rows[0] });
  } catch (error) {
    console.error('Listing lookup failed:', error);
    return res.status(500).json({ error: 'Unable to load the listing.' });
  }
});

app.get('/api/my-listings', authenticate, async (req, res) => {
  if (!requireConfiguration(res)) return;
  const result = await pool.query(
    `SELECT id, title, course_code AS "courseCode", price::text, condition, description, campus,
            image_url AS "imageUrl",
            CASE WHEN status = 'ACTIVE' AND expires_at <= NOW() THEN 'EXPIRED' ELSE status END AS status,
            created_at AS "createdAt", category, is_trade AS "isTrade", trade_request AS "tradeRequest",
            payment_status AS "paymentStatus", moderation_status AS "moderationStatus",
            payment_review_reason AS "paymentReviewReason", moderation_review_reason AS "moderationReviewReason",
            expires_at AS "expiresAt"
     FROM listings WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.sub],
  );
  return res.json({ listings: result.rows });
});

app.get('/api/my-listings/:id', authenticate, async (req, res) => {
  if (!requireConfiguration(res)) return;
  if (!isValidListingId(req.params.id)) return res.status(400).json({ error: 'Listing ID is invalid.' });
  const result = await pool.query(
    `SELECT id, title, course_code AS "courseCode", price::text, condition, description, campus,
            image_url AS "imageUrl",
            CASE WHEN status = 'ACTIVE' AND expires_at <= NOW() THEN 'EXPIRED' ELSE status END AS status,
            created_at AS "createdAt", category, is_trade AS "isTrade", trade_request AS "tradeRequest",
            payment_status AS "paymentStatus", moderation_status AS "moderationStatus",
            payment_review_reason AS "paymentReviewReason", moderation_review_reason AS "moderationReviewReason",
            expires_at AS "expiresAt"
     FROM listings WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user.sub],
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Listing not found.' });
  return res.json({ listing: result.rows[0] });
});

app.post('/api/listings', authenticate, async (req, res) => {
  if (!requireConfiguration(res)) return;
  if (req.body?.policyAccepted !== true || req.body?.policyVersion !== LISTING_POLICY_VERSION) {
    return res.status(400).json({ error: 'Please accept the current marketplace rules before submitting.' });
  }
  const listing = normalizeListing(req.body);
  const validationError = validateListing(listing);
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    const result = await pool.query(
      `INSERT INTO listings
        (user_id, title, course_code, price, condition, description, campus, image_url, category, is_trade, trade_request,
         status, payment_status, moderation_status, policy_version, policy_acknowledged_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING_PAYMENT', 'DUE', 'PENDING', $12, NOW())
       RETURNING id, title, course_code AS "courseCode", price::text, condition, description, campus,
               image_url AS "imageUrl", status, created_at AS "createdAt", category, is_trade AS "isTrade", trade_request AS "tradeRequest",
               payment_status AS "paymentStatus", moderation_status AS "moderationStatus"`,
      [req.user.sub, listing.title, listing.courseCode, listing.price, listing.condition, listing.description, listing.campus, listing.imageUrl, listing.category, listing.isTrade, listing.tradeRequest, LISTING_POLICY_VERSION],
    );
    return res.status(201).json({ listing: result.rows[0] });
  } catch (error) {
    console.error('Listing creation failed:', error);
    return res.status(500).json({ error: 'Unable to publish the listing.' });
  }
});

app.post('/api/listings/:id/payment-proof', authenticate, async (req, res) => {
  if (!requireConfiguration(res)) return;
  if (!isValidListingId(req.params.id)) return res.status(400).json({ error: 'Listing ID is invalid.' });
  const instructions = getPaymentInstructions();
  if (!instructions) {
    return res.status(503).json({ error: 'Listing payment instructions are not configured yet. Please contact the marketplace administrator.' });
  }
  const proof = getPaymentProofFile(req.body?.dataUrl);
  if (!proof) return res.status(400).json({ error: 'Upload a valid JPEG, PNG, or PDF proof of payment up to 5MB.' });
  const fileName = String(req.body?.fileName || 'payment-proof')
    .replace(/[^\w.-]/g, '_')
    .slice(0, 120);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const updated = await client.query(
      `UPDATE listings SET status = 'PENDING_PAYMENT_REVIEW', payment_status = 'SUBMITTED',
         payment_review_reason = NULL, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'PENDING_PAYMENT'
         AND payment_status IN ('DUE', 'REJECTED')
       RETURNING id`,
      [req.params.id, req.user.sub],
    );
    if (!updated.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pending listing not found or payment proof is already under review.' });
    }
    await client.query(
      `INSERT INTO listing_payment_proofs (listing_id, uploaded_by, mime_type, original_file_name, proof_data)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.params.id, req.user.sub, proof.mimeType, fileName, proof.data],
    );
    await client.query(
      `INSERT INTO listing_review_events (listing_id, actor_id, event_type, decision, reason)
       VALUES ($1, $2, 'PAYMENT_PROOF_SUBMITTED', 'SUBMITTED', NULL)`,
      [req.params.id, req.user.sub],
    );
    await client.query('COMMIT');
    return res.status(201).json({ status: 'PENDING_PAYMENT_REVIEW' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Payment proof submission failed:', error);
    return res.status(500).json({ error: 'Unable to submit payment proof.' });
  } finally {
    client.release();
  }
});

app.post('/api/listings/:id/renew', authenticate, async (req, res) => {
  if (!requireConfiguration(res)) return;
  if (!isValidListingId(req.params.id)) return res.status(400).json({ error: 'Listing ID is invalid.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE listings
       SET status = 'PENDING_PAYMENT', payment_status = 'DUE', moderation_status = 'PENDING',
           payment_review_reason = NULL, moderation_review_reason = NULL, expires_at = NULL, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND
         (status = 'EXPIRED' OR (status = 'ACTIVE' AND expires_at IS NOT NULL AND expires_at <= NOW()))
       RETURNING id, status, payment_status AS "paymentStatus"`,
      [req.params.id, req.user.sub],
    );
    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Only expired listings can be renewed.' });
    }
    await client.query(
      `INSERT INTO listing_review_events (listing_id, actor_id, event_type, decision)
       VALUES ($1, $2, 'RENEWAL_STARTED', 'PAYMENT_REQUIRED')`,
      [req.params.id, req.user.sub],
    );
    await client.query('COMMIT');
    return res.json({ listing: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Listing renewal failed:', error);
    return res.status(500).json({ error: 'Unable to start listing renewal.' });
  } finally {
    client.release();
  }
});

app.patch('/api/listings/:id', authenticate, async (req, res) => {
  if (!requireConfiguration(res)) return;
  if (!isValidListingId(req.params.id)) return res.status(400).json({ error: 'Listing ID is invalid.' });
  if (req.body?.policyAccepted !== true || req.body?.policyVersion !== LISTING_POLICY_VERSION) {
    return res.status(400).json({ error: 'Please accept the current marketplace rules before submitting changes.' });
  }
  const listing = normalizeListing(req.body);
  const validationError = validateListing(listing);
  if (validationError) return res.status(400).json({ error: validationError });
  const result = await pool.query(
    `UPDATE listings SET title = $1, course_code = $2, price = $3, condition = $4,
      description = $5, campus = $6, image_url = $7, category = $8, is_trade = $9,
      trade_request = $10, status = CASE WHEN payment_status = 'VERIFIED' THEN 'PENDING_CONTENT_REVIEW' ELSE 'PENDING_PAYMENT' END,
      moderation_status = 'PENDING', moderation_review_reason = NULL,
      policy_version = $11, policy_acknowledged_at = NOW(), updated_at = NOW()
     WHERE id = $12 AND user_id = $13
       AND status NOT IN ('SOLD', 'WITHDRAWN', 'PENDING_PAYMENT_REVIEW')
     RETURNING id, title, course_code AS "courseCode", price::text, condition, description, campus,
               image_url AS "imageUrl", status, created_at AS "createdAt", category,
               is_trade AS "isTrade", trade_request AS "tradeRequest",
               payment_status AS "paymentStatus", moderation_status AS "moderationStatus"`,
    [listing.title, listing.courseCode, listing.price, listing.condition, listing.description, listing.campus, listing.imageUrl, listing.category, listing.isTrade, listing.tradeRequest, LISTING_POLICY_VERSION, req.params.id, req.user.sub],
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Listing not found or not editable.' });
  return res.json({ listing: result.rows[0] });
});

app.post('/api/listings/:id/sold', authenticate, async (req, res) => {
  if (!requireConfiguration(res)) return;
  if (!isValidListingId(req.params.id)) return res.status(400).json({ error: 'Listing ID is invalid.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE listings SET status = 'SOLD', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'ACTIVE'
         AND (expires_at IS NULL OR expires_at > NOW())
       RETURNING id, status`,
      [req.params.id, req.user.sub],
    );
    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Listing not found or already marked as sold.' });
    }
    await client.query(
      `INSERT INTO listing_review_events (listing_id, actor_id, event_type, decision)
       VALUES ($1, $2, 'LISTING_SOLD', 'SOLD')`,
      [req.params.id, req.user.sub],
    );
    await client.query(
      `WITH declined AS (
         UPDATE exchanges SET status = 'DECLINED', responded_at = NOW()
         WHERE listing_id = $1 AND status = 'PENDING'
         RETURNING id
       )
       INSERT INTO exchange_review_events (exchange_id, actor_id, old_status, new_status, reason)
       SELECT id, $2, 'PENDING', 'DECLINED', 'Listing marked as sold'
       FROM declined`,
      [req.params.id, req.user.sub],
    );
    await client.query('COMMIT');
    return res.json({ listing: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Mark listing as sold failed:', error);
    return res.status(500).json({ error: 'Unable to mark the listing as sold.' });
  } finally {
    client.release();
  }
});

app.get('/api/admin/listings/review-queue', authenticate, requireAdmin, async (req, res) => {
  if (!requireConfiguration(res)) return;
  try {
    const result = await pool.query(
      `SELECT l.id, l.title, l.course_code AS "courseCode", l.price::text, l.condition,
              l.description, l.campus, l.image_url AS "imageUrl", l.category,
              l.is_trade AS "isTrade", l.trade_request AS "tradeRequest", l.status,
              l.payment_status AS "paymentStatus", l.moderation_status AS "moderationStatus",
              l.created_at AS "createdAt", u.email AS "sellerEmail",
              u.first_name AS "sellerFirstName", u.last_name AS "sellerLastName",
              proof.created_at AS "proofUploadedAt", proof.original_file_name AS "proofFileName"
       FROM listings l JOIN users u ON u.id = l.user_id
       LEFT JOIN LATERAL (
         SELECT created_at, original_file_name FROM listing_payment_proofs
         WHERE listing_id = l.id ORDER BY created_at DESC LIMIT 1
       ) proof ON TRUE
       WHERE l.payment_status = 'SUBMITTED'
          OR (l.payment_status = 'VERIFIED' AND l.moderation_status = 'PENDING'
              AND l.status = 'PENDING_CONTENT_REVIEW')
       ORDER BY l.updated_at ASC`,
    );
    return res.json({ listings: result.rows });
  } catch (error) {
    console.error('Listing review queue failed:', error);
    return res.status(500).json({ error: 'Unable to load listing reviews.' });
  }
});

app.get('/api/admin/listings/:id/payment-proof', authenticate, requireAdmin, async (req, res) => {
  if (!requireConfiguration(res)) return;
  if (!isValidListingId(req.params.id)) return res.status(400).json({ error: 'Listing ID is invalid.' });
  try {
    const result = await pool.query(
      `SELECT mime_type, original_file_name, proof_data
       FROM listing_payment_proofs WHERE listing_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [req.params.id],
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Payment proof not found.' });
    const proof = result.rows[0];
    res.set({
      'Content-Type': proof.mime_type,
      'Content-Disposition': `inline; filename="${proof.original_file_name}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.send(proof.proof_data);
  } catch (error) {
    console.error('Admin payment proof retrieval failed:', error);
    return res.status(500).json({ error: 'Unable to retrieve payment proof.' });
  }
});

app.post('/api/admin/listings/:id/payment-review', authenticate, requireAdmin, async (req, res) => {
  if (!requireConfiguration(res)) return;
  if (!isValidListingId(req.params.id)) return res.status(400).json({ error: 'Listing ID is invalid.' });
  const { decision, reason } = req.body || {};
  if (!['VERIFIED', 'REJECTED'].includes(decision) || (decision === 'REJECTED' && !String(reason || '').trim())) {
    return res.status(400).json({ error: 'Choose payment verification or provide a rejection reason.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const status = decision === 'VERIFIED' ? 'PENDING_CONTENT_REVIEW' : 'PENDING_PAYMENT';
    const updated = await client.query(
      `UPDATE listings SET payment_status = $1, status = $2, payment_review_reason = $3, updated_at = NOW()
       WHERE id = $4 AND payment_status = 'SUBMITTED'
       RETURNING id`,
      [decision, status, decision === 'REJECTED' ? String(reason).trim().slice(0, 1000) : null, req.params.id],
    );
    if (!updated.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Payment proof is no longer awaiting review.' });
    }
    await client.query(
      `INSERT INTO listing_review_events (listing_id, actor_id, event_type, decision, reason)
       VALUES ($1, $2, 'PAYMENT_REVIEW', $3, $4)`,
      [req.params.id, req.user.sub, decision, decision === 'REJECTED' ? String(reason).trim().slice(0, 1000) : null],
    );
    await client.query('COMMIT');
    return res.json({ status });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Payment review failed:', error);
    return res.status(500).json({ error: 'Unable to record payment review.' });
  } finally {
    client.release();
  }
});

app.post('/api/admin/listings/:id/moderation-review', authenticate, requireAdmin, async (req, res) => {
  if (!requireConfiguration(res)) return;
  if (!isValidListingId(req.params.id)) return res.status(400).json({ error: 'Listing ID is invalid.' });
  const { decision, reason, checklist } = req.body || {};
  if (!['APPROVED', 'REJECTED'].includes(decision) || (decision === 'REJECTED' && !String(reason || '').trim())) {
    return res.status(400).json({ error: 'Choose listing approval or provide a rejection reason.' });
  }
  if (decision === 'APPROVED' && (!Array.isArray(checklist) || checklist.length !== LISTING_REVIEW_CHECKLIST_ITEMS || checklist.some((item) => item !== true))) {
    return res.status(400).json({ error: 'Complete the policy review checklist before approving this listing.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const updated = await client.query(
      `UPDATE listings SET moderation_status = $1,
         moderation_review_reason = $2,
         status = CASE WHEN $1 = 'APPROVED' THEN 'ACTIVE' ELSE 'REJECTED' END,
         expires_at = CASE WHEN $1 = 'APPROVED' THEN COALESCE(expires_at, NOW() + INTERVAL '30 days') ELSE expires_at END,
         updated_at = NOW()
       WHERE id = $3 AND payment_status = 'VERIFIED'
         AND moderation_status = 'PENDING' AND status = 'PENDING_CONTENT_REVIEW'
       RETURNING id`,
      [decision, decision === 'REJECTED' ? String(reason).trim().slice(0, 1000) : null, req.params.id],
    );
    if (!updated.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Listing is not awaiting content review or its payment is unverified.' });
    }
    await client.query(
      `INSERT INTO listing_review_events (listing_id, actor_id, event_type, decision, reason, checklist)
       VALUES ($1, $2, 'CONTENT_REVIEW', $3, $4, $5)`,
      [req.params.id, req.user.sub, decision, decision === 'REJECTED' ? String(reason).trim().slice(0, 1000) : null, JSON.stringify(checklist || [])],
    );
    await client.query('COMMIT');
    return res.json({ status: decision === 'APPROVED' ? 'ACTIVE' : 'REJECTED' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Listing moderation failed:', error);
    return res.status(500).json({ error: 'Unable to record listing review.' });
  } finally {
    client.release();
  }
});

app.post('/api/analytics/visits', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Analytics storage is not configured.' });
  try {
    await pool.query(
      `INSERT INTO visitor_events (path, referrer, user_agent, ip_hash)
       VALUES ($1, $2, $3, $4)`,
      [String(req.body?.path || '/').slice(0, 500), req.get('referer')?.slice(0, 500) || null, req.get('user-agent')?.slice(0, 500) || null, hashVisitorIp(req)],
    );
    return res.status(201).json({ tracked: true });
  } catch (error) {
    console.error('Visitor tracking failed:', error);
    return res.status(500).json({ error: 'Unable to record visitor event.' });
  }
});

app.post('/api/reports', authenticate, async (req, res) => {
  if (!requireConfiguration(res)) return;
  const validation = validateReportInput(req.body, req.user.sub);
  if (validation.error) return res.status(400).json({ error: validation.error });
  const { category, description, listingId, userId } = validation.value;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`report:${req.user.sub}`]);
    const recentReports = await client.query(
      `SELECT COUNT(*)::int AS count FROM reports
       WHERE reporter_id = $1 AND created_at >= NOW() - INTERVAL '1 hour'`,
      [req.user.sub],
    );
    if (recentReports.rows[0].count >= 5) {
      await client.query('ROLLBACK');
      res.set('Retry-After', '3600');
      return res.status(429).json({ error: 'Too many reports. Please try again later.' });
    }
    const duplicate = await client.query(
      `SELECT 1 FROM reports
       WHERE reporter_id = $1 AND category = $2
         AND listing_id IS NOT DISTINCT FROM $3::bigint
         AND user_id IS NOT DISTINCT FROM $4::bigint
         AND created_at >= NOW() - INTERVAL '10 minutes'
       LIMIT 1`,
      [req.user.sub, category, listingId, userId],
    );
    if (duplicate.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'You recently submitted a report for this target.' });
    }
    if (listingId) {
      const target = await client.query('SELECT 1 FROM listings WHERE id = $1', [listingId]);
      if (!target.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'The listing could not be found.' });
      }
    } else {
      const target = await client.query('SELECT 1 FROM users WHERE id = $1', [userId]);
      if (!target.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'The user could not be found.' });
      }
    }
    const inserted = await client.query(
      `INSERT INTO reports (reporter_id, reporter_email, listing_id, user_id, category, description)
       VALUES ($1, NULL, $2, $3, $4, $5)
       RETURNING id`,
      [req.user.sub, listingId, userId, category, description],
    );
    await client.query('COMMIT');
    return res.status(201).json({ reportId: inserted.rows[0].id });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Report submission failed:', error);
    return res.status(500).json({ error: 'Unable to submit the report.' });
  } finally {
    client.release();
  }
});

app.patch('/api/users/me', authenticate, async (req, res) => {
  if (!requireConfiguration(res)) return;
  const { firstName, lastName, gender, phone, campus, faculty } = req.body || {};
  try {
    await pool.query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           gender = COALESCE($3, gender),
           phone = COALESCE($4, phone),
           campus = COALESCE($5, campus),
           faculty = COALESCE($6, faculty)
       WHERE id = $7`,
      [firstName, lastName, gender, phone, campus, faculty, req.user.sub],
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('Profile update failed:', error);
    return res.status(500).json({ error: 'Unable to update profile details.' });
  }
});

app.get('/api/users/me', authenticate, async (req, res) => {
  if (!requireConfiguration(res)) return;
  try {
    const result = await pool.query('SELECT id, email, first_name, last_name, gender, phone, campus, faculty, role FROM users WHERE id = $1', [req.user.sub]);
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Profile retrieval failed:', error);
    return res.status(500).json({ error: 'Unable to load profile.' });
  }
});

app.post('/api/exchanges', authenticate, async (req, res) => {
  if (!requireConfiguration(res)) return;
  const validation = validateExchangeInput(req.body);
  if (validation.error) return res.status(400).json({ error: validation.error });
  const { listingId, offeredBookTitle, offeredBookCourse, conditionPreference, notes } = validation.value;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const listing = await client.query(
      `SELECT id, user_id, status, is_trade, expires_at
       FROM listings WHERE id = $1 FOR UPDATE`,
      [listingId],
    );
    const target = listing.rows[0];
    if (!target || target.status !== 'ACTIVE' || (target.expires_at && new Date(target.expires_at) <= new Date())) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Approved active listing not found.' });
    }
    if (!target.is_trade) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This listing is not accepting exchange requests.' });
    }
    if (String(target.user_id) === String(req.user.sub)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'You cannot request an exchange for your own listing.' });
    }
    const accepted = await client.query(
      `SELECT 1 FROM exchanges WHERE listing_id = $1 AND status = 'ACCEPTED' LIMIT 1`,
      [listingId],
    );
    if (accepted.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'The owner has already accepted an exchange for this listing.' });
    }
    const duplicate = await client.query(
      `SELECT 1 FROM exchanges
       WHERE requester_id = $1 AND listing_id = $2 AND status = 'PENDING'
       LIMIT 1`,
      [req.user.sub, listingId],
    );
    if (duplicate.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'You already have a pending request for this listing.' });
    }
    const rate = await client.query(
      `SELECT COUNT(*)::int AS count FROM exchanges
       WHERE requester_id = $1 AND created_at >= NOW() - INTERVAL '1 hour'`,
      [req.user.sub],
    );
    if (rate.rows[0].count >= 10) {
      await client.query('ROLLBACK');
      res.set('Retry-After', '3600');
      return res.status(429).json({ error: 'Too many exchange requests. Please try again later.' });
    }
    const inserted = await client.query(
      `INSERT INTO exchanges
         (requester_id, listing_id, offered_book_title, offered_book_course,
          condition_preference, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, status, created_at AS "createdAt"`,
      [req.user.sub, listingId, offeredBookTitle, offeredBookCourse, conditionPreference, notes],
    );
    await client.query(
      `INSERT INTO exchange_review_events (exchange_id, actor_id, old_status, new_status)
       VALUES ($1, $2, NULL, 'PENDING')`,
      [inserted.rows[0].id, req.user.sub],
    );
    await client.query('COMMIT');
    return res.status(201).json({ exchange: { ...inserted.rows[0], listingId } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Exchange request failed:', error);
    return res.status(500).json({ error: 'Unable to post exchange request.' });
  } finally {
    client.release();
  }
});

app.get('/api/my-exchanges', authenticate, async (req, res) => {
  if (!requireConfiguration(res)) return;
  try {
    const [outgoing, incoming] = await Promise.all([
      pool.query(
        `SELECT e.id, e.listing_id AS "listingId", l.title AS "listingTitle",
                l.status AS "listingStatus", e.offered_book_title AS "offeredBookTitle",
                e.offered_book_course AS "offeredBookCourse",
                e.condition_preference AS "conditionPreference", e.notes, e.status,
                e.created_at AS "createdAt", e.responded_at AS "respondedAt",
                'OUTGOING' AS direction
         FROM exchanges e JOIN listings l ON l.id = e.listing_id
         WHERE e.requester_id = $1
         ORDER BY e.created_at DESC LIMIT 100`,
        [req.user.sub],
      ),
      pool.query(
        `SELECT e.id, e.listing_id AS "listingId", l.title AS "listingTitle",
                l.status AS "listingStatus", e.offered_book_title AS "offeredBookTitle",
                e.offered_book_course AS "offeredBookCourse",
                e.condition_preference AS "conditionPreference", e.notes, e.status,
                e.created_at AS "createdAt", e.responded_at AS "respondedAt",
                requester.first_name AS "requesterFirstName",
                requester.last_name AS "requesterLastName",
                'INCOMING' AS direction
         FROM exchanges e JOIN listings l ON l.id = e.listing_id
         JOIN users requester ON requester.id = e.requester_id
         WHERE l.user_id = $1
         ORDER BY e.created_at DESC LIMIT 100`,
        [req.user.sub],
      ),
    ]);
    return res.json({ outgoing: outgoing.rows, incoming: incoming.rows });
  } catch (error) {
    console.error('Exchange request retrieval failed:', error);
    return res.status(500).json({ error: 'Unable to load exchange requests.' });
  }
});

app.patch('/api/exchanges/:id', authenticate, async (req, res) => {
  if (!requireConfiguration(res)) return;
  if (!isValidListingId(req.params.id)) return res.status(400).json({ error: 'Exchange ID is invalid.' });
  const decision = req.body?.status;
  if (!['ACCEPTED', 'DECLINED'].includes(decision)) {
    return res.status(400).json({ error: 'Exchange status must be ACCEPTED or DECLINED.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(
      `SELECT e.id, e.status, e.listing_id, l.user_id AS owner_id,
              l.status AS listing_status, l.expires_at
       FROM exchanges e JOIN listings l ON l.id = e.listing_id
       WHERE e.id = $1
       FOR UPDATE OF e, l`,
      [req.params.id],
    );
    const exchange = current.rows[0];
    if (!exchange) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Exchange request not found.' });
    }
    if (String(exchange.owner_id) !== String(req.user.sub)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only the listing owner can respond to this request.' });
    }
    if (exchange.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'This exchange request has already been decided.' });
    }
    if (exchange.listing_status !== 'ACTIVE'
        || (exchange.expires_at && new Date(exchange.expires_at) <= new Date())) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'This listing is no longer available for an exchange.' });
    }
    if (decision === 'ACCEPTED') {
      const accepted = await client.query(
        `SELECT 1 FROM exchanges
         WHERE listing_id = $1 AND status = 'ACCEPTED' AND id <> $2
         LIMIT 1`,
        [exchange.listing_id, exchange.id],
      );
      if (accepted.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Another exchange request was already accepted.' });
      }
    }
    await client.query(
      `UPDATE exchanges SET status = $1, responded_at = NOW() WHERE id = $2`,
      [decision, exchange.id],
    );
    await client.query(
      `INSERT INTO exchange_review_events (exchange_id, actor_id, old_status, new_status)
       VALUES ($1, $2, 'PENDING', $3)`,
      [exchange.id, req.user.sub, decision],
    );
    if (decision === 'ACCEPTED') {
      await client.query(
        `WITH declined AS (
           UPDATE exchanges SET status = 'DECLINED', responded_at = NOW()
           WHERE listing_id = $1 AND id <> $2 AND status = 'PENDING'
           RETURNING id
         )
         INSERT INTO exchange_review_events (exchange_id, actor_id, old_status, new_status, reason)
         SELECT id, $3, 'PENDING', 'DECLINED', 'Another exchange request was accepted'
         FROM declined`,
        [exchange.listing_id, exchange.id, req.user.sub],
      );
    }
    await client.query('COMMIT');
    return res.json({ exchange: { id: exchange.id, status: decision } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Exchange decision failed:', error);
    return res.status(500).json({ error: 'Unable to update the exchange request.' });
  } finally {
    client.release();
  }
});

app.get(['/api/reports', '/api/admin/reports'], authenticate, requireAdmin, async (req, res) => {

  if (!requireConfiguration(res)) return;
  const allowedStatuses = new Set(['ALL', 'OPEN', 'REVIEWED', 'RESOLVED']);
  const status = String(req.query.status || 'ALL').toUpperCase();
  if (!allowedStatuses.has(status)) return res.status(400).json({ error: 'Choose a valid report status filter.' });
  try {
    const values = [];
    const filter = status === 'ALL' ? '' : `WHERE r.status = $${values.push(status)}`;
    const result = await pool.query(
      `SELECT r.id, r.reporter_id AS "reporterId", r.reporter_email AS "reporterEmail",
              r.listing_id AS "listingId", r.user_id AS "reportedUserId",
              r.category, r.description, r.status, r.created_at AS "createdAt",
              u.first_name AS "reporterFirstName", u.last_name AS "reporterLastName",
              l.title AS "listingTitle", us.email AS "reportedUserEmail",
              us.first_name AS "reportedFirstName", us.last_name AS "reportedLastName"
       FROM reports r
       LEFT JOIN users u ON u.id = r.reporter_id
       LEFT JOIN listings l ON l.id = r.listing_id
       LEFT JOIN users us ON us.id = r.user_id
       ${filter}
       ORDER BY r.created_at DESC`,
      values,
    );
    return res.json({ reports: result.rows });
  } catch (error) {
    console.error('Reports retrieval failed:', error);
    return res.status(500).json({ error: 'Unable to load reports.' });
  }
});

app.patch('/api/admin/reports/:id', authenticate, requireAdmin, async (req, res) => {
  if (!requireConfiguration(res)) return;
  if (!isValidListingId(req.params.id)) return res.status(400).json({ error: 'Report ID is invalid.' });
  const { status, note } = req.body || {};
  if (!['REVIEWED', 'RESOLVED'].includes(status)) {
    return res.status(400).json({ error: 'Report status must be REVIEWED or RESOLVED.' });
  }
  if (note !== undefined && (typeof note !== 'string' || note.trim().length > 1000)) {
    return res.status(400).json({ error: 'Internal note must be 1000 characters or fewer.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT status FROM reports WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!current.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Report not found.' });
    }
    const oldStatus = current.rows[0].status;
    const allowedTransition = (oldStatus === 'OPEN' && ['REVIEWED', 'RESOLVED'].includes(status))
      || (oldStatus === 'REVIEWED' && status === 'RESOLVED');
    if (!allowedTransition) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `A report cannot move from ${oldStatus} to ${status}.` });
    }
    await client.query('UPDATE reports SET status = $1 WHERE id = $2', [status, req.params.id]);
    await client.query(
      `INSERT INTO report_review_events (report_id, admin_id, old_status, new_status, internal_note)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.params.id, req.user.sub, oldStatus, status, note?.trim() || null],
    );
    await client.query('COMMIT');
    return res.json({ id: req.params.id, status });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Admin report update failed:', error);
    return res.status(500).json({ error: 'Unable to update report status.' });
  } finally {
    client.release();
  }
});

app.get('/api/analytics/summary', authenticate, requireAdmin, async (req, res) => {

  if (!pool) return res.status(503).json({ error: 'Analytics storage is not configured.' });
  try {
    const [totals, popularPaths, daily] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS visits, COUNT(DISTINCT ip_hash)::int AS visitors FROM visitor_events`),
      pool.query(`SELECT path, COUNT(*)::int AS visits FROM visitor_events GROUP BY path ORDER BY visits DESC LIMIT 10`),
      pool.query(`SELECT DATE(created_at) AS date, COUNT(*)::int AS visits FROM visitor_events
        WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY date`),
    ]);
    return res.json({ totals: totals.rows[0], popularPaths: popularPaths.rows, daily: daily.rows });
  } catch (error) {
    console.error('Analytics query failed:', error);
    return res.status(500).json({ error: 'Unable to load analytics.' });
  }
});

app.get('/api/admin/overview', authenticate, requireAdmin, async (req, res) => {
  if (!requireConfiguration(res)) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const [users, listings, reports, fees, visitors] = await Promise.all([
      client.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS registered_last_30_days
         FROM users`,
      ),
      client.query(
        `SELECT COUNT(*) FILTER (WHERE status = 'ACTIVE' AND (expires_at IS NULL OR expires_at > NOW()))::int AS active,
                COUNT(*) FILTER (WHERE status IN ('PENDING_PAYMENT', 'PENDING_PAYMENT_REVIEW'))::int AS pending_payment,
                COUNT(*) FILTER (WHERE status = 'PENDING_CONTENT_REVIEW')::int AS pending_content_review,
                COUNT(*) FILTER (WHERE status = 'REJECTED')::int AS rejected,
                COUNT(*) FILTER (WHERE status = 'SOLD')::int AS sold,
                COUNT(*) FILTER (WHERE status = 'EXPIRED' OR (status = 'ACTIVE' AND expires_at <= NOW()))::int AS expired
         FROM listings`,
      ),
      client.query(
        `SELECT COUNT(*) FILTER (WHERE status = 'OPEN')::int AS open,
                COUNT(*) FILTER (WHERE status = 'REVIEWED')::int AS reviewed,
                COUNT(*) FILTER (WHERE status = 'RESOLVED')::int AS resolved
         FROM reports`,
      ),
      client.query(
        `SELECT COUNT(*) FILTER (WHERE payment_status = 'VERIFIED')::int AS verified_periods,
                COUNT(*) FILTER (WHERE payment_status = 'VERIFIED' AND status = 'ACTIVE'
                  AND (expires_at IS NULL OR expires_at > NOW()))::int AS active_periods,
                COUNT(*) FILTER (WHERE payment_status = 'SUBMITTED')::int AS pending_proofs,
                COUNT(*) FILTER (WHERE payment_status = 'REJECTED')::int AS rejected_proofs,
                (COUNT(*) FILTER (WHERE payment_status = 'VERIFIED') * 5)::numeric(12,2)::text AS verified_listing_fees_zar
         FROM listings`,
      ),
      client.query(
        `SELECT COUNT(*)::int AS visits, COUNT(DISTINCT ip_hash)::int AS unique_visitors
         FROM visitor_events`,
      ),
    ]);
    await client.query('COMMIT');
    return res.json({
      users: users.rows[0],
      listings: listings.rows[0],
      reports: reports.rows[0],
      fees: fees.rows[0],
      visitors: visitors.rows[0],
      feeTerms: { amountZar: '5.00', periodDays: 30, automaticRenewal: false },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Admin overview failed:', error);
    return res.status(500).json({ error: 'Unable to load admin overview.' });
  } finally {
    client.release();
  }
});

app.get('/api/admin/fee-periods', authenticate, requireAdmin, async (req, res) => {
  if (!requireConfiguration(res)) return;
  const allowedStatuses = new Set(['ALL', 'DUE', 'SUBMITTED', 'VERIFIED', 'REJECTED']);
  const paymentStatus = String(req.query.paymentStatus || 'ALL').toUpperCase();
  if (!allowedStatuses.has(paymentStatus)) {
    return res.status(400).json({ error: 'Choose a valid payment status filter.' });
  }
  const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit || '50'), 10) || 50, 1), 100);
  const offset = Math.max(Number.parseInt(String(req.query.offset || '0'), 10) || 0, 0);
  try {
    const values = [];
    let filter = '';
    if (paymentStatus !== 'ALL') {
      values.push(paymentStatus);
      filter = `WHERE l.payment_status = $${values.length}`;
    }
    values.push(limit, offset);
    const result = await pool.query(
      `SELECT l.id, l.title, l.course_code AS "courseCode", l.status,
              l.payment_status AS "paymentStatus", l.moderation_status AS "moderationStatus",
              l.created_at AS "createdAt", l.expires_at AS "expiresAt",
              CASE WHEN l.status = 'ACTIVE' AND l.expires_at <= NOW() THEN 'EXPIRED' ELSE l.status END AS "effectiveStatus",
              u.first_name AS "sellerFirstName", u.last_name AS "sellerLastName", u.email AS "sellerEmail",
              proof.created_at AS "proofUploadedAt"
       FROM listings l JOIN users u ON u.id = l.user_id
       LEFT JOIN LATERAL (
         SELECT created_at FROM listing_payment_proofs
         WHERE listing_id = l.id ORDER BY created_at DESC LIMIT 1
       ) proof ON TRUE
       ${filter}
       ORDER BY l.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );
    return res.json({ periods: result.rows, fee: { amountZar: '5.00', periodDays: 30, automaticRenewal: false } });
  } catch (error) {
    console.error('Admin fee-period query failed:', error);
    return res.status(500).json({ error: 'Unable to load listing fee periods.' });
  }
});

// Basic Route
app.get('/', (req, res) => {
  res.send('Secondhand Textbook Server is running!');
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', databaseConfigured: Boolean(pool) });
});

const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    gender TEXT,
    campus TEXT,
    faculty TEXT,
    phone TEXT,
    contact_display_consent BOOLEAN NOT NULL DEFAULT FALSE,
    popia_consented_at TIMESTAMPTZ,
    popia_consent_version TEXT,
    role TEXT NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT', 'ADMIN')),
    password_version INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ALTER TABLE users ADD COLUMN IF NOT EXISTS password_version INTEGER NOT NULL DEFAULT 0;
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx
    ON password_reset_tokens (user_id, created_at DESC);
  CREATE TABLE IF NOT EXISTS password_reset_requests (
    id BIGSERIAL PRIMARY KEY,
    email_key TEXT NOT NULL,
    ip_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS password_reset_requests_email_time_idx
    ON password_reset_requests (email_key, created_at DESC);
  CREATE INDEX IF NOT EXISTS password_reset_requests_ip_time_idx
    ON password_reset_requests (ip_key, created_at DESC);
  CREATE INDEX IF NOT EXISTS password_reset_requests_created_at_idx
    ON password_reset_requests (created_at);
  CREATE TABLE IF NOT EXISTS password_reset_attempts (
    id BIGSERIAL PRIMARY KEY,
    ip_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS password_reset_attempts_ip_time_idx
    ON password_reset_attempts (ip_key, created_at DESC);
  CREATE INDEX IF NOT EXISTS password_reset_attempts_created_at_idx
    ON password_reset_attempts (created_at);
  CREATE TABLE IF NOT EXISTS visitor_events (
    id BIGSERIAL PRIMARY KEY,
    path TEXT NOT NULL,
    referrer TEXT,
    user_agent TEXT,
    ip_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS login_attempts (
    attempt_key TEXT PRIMARY KEY,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS listings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    course_code TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    condition TEXT NOT NULL CHECK (condition IN ('Like New', 'Good', 'Acceptable', 'Worn')),
    description TEXT NOT NULL,
    campus TEXT NOT NULL,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SOLD', 'PENDING_PAYMENT', 'PENDING_PAYMENT_REVIEW', 'PENDING_CONTENT_REVIEW', 'REJECTED', 'EXPIRED', 'WITHDRAWN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  DO $$
  BEGIN
    PERFORM pg_advisory_xact_lock(427162025);
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'listings'::regclass
        AND conname = 'listings_status_check'
        AND pg_get_constraintdef(oid) LIKE '%PENDING_PAYMENT%'
    ) THEN
      ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;
      ALTER TABLE listings ADD CONSTRAINT listings_status_check
        CHECK (status IN ('ACTIVE', 'SOLD', 'PENDING_PAYMENT', 'PENDING_PAYMENT_REVIEW', 'PENDING_CONTENT_REVIEW', 'REJECTED', 'EXPIRED', 'WITHDRAWN'));
    END IF;
  END $$;
  ALTER TABLE listings ALTER COLUMN price DROP NOT NULL;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Textbook';
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_trade BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS trade_request TEXT;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'VERIFIED'
    CHECK (payment_status IN ('DUE', 'SUBMITTED', 'VERIFIED', 'REJECTED'));
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'APPROVED'
    CHECK (moderation_status IN ('PENDING', 'APPROVED', 'REJECTED'));
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS payment_review_reason TEXT;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS moderation_review_reason TEXT;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS policy_version TEXT;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS policy_acknowledged_at TIMESTAMPTZ;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
  CREATE TABLE IF NOT EXISTS listing_payment_proofs (
    id BIGSERIAL PRIMARY KEY,
    listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    uploaded_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'application/pdf')),
    original_file_name TEXT NOT NULL,
    proof_data BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS listing_payment_proofs_listing_idx
    ON listing_payment_proofs (listing_id, created_at DESC);
  CREATE TABLE IF NOT EXISTS listing_review_events (
    id BIGSERIAL PRIMARY KEY,
    listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    decision TEXT NOT NULL,
    reason TEXT,
    checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS listing_review_events_listing_idx
    ON listing_review_events (listing_id, created_at DESC);
  CREATE TABLE IF NOT EXISTS reports (
    id BIGSERIAL PRIMARY KEY,
    reporter_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    reporter_email TEXT,
    listing_id BIGINT REFERENCES listings(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'REVIEWED', 'RESOLVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS reports_reporter_created_idx
    ON reports (reporter_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS reports_target_created_idx
    ON reports (listing_id, user_id, created_at DESC);
  CREATE TABLE IF NOT EXISTS report_review_events (
    id BIGSERIAL PRIMARY KEY,
    report_id BIGINT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    admin_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    old_status TEXT NOT NULL,
    new_status TEXT NOT NULL CHECK (new_status IN ('REVIEWED', 'RESOLVED')),
    internal_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS report_review_events_report_idx
    ON report_review_events (report_id, created_at DESC);
  CREATE TABLE IF NOT EXISTS exchanges (
    id BIGSERIAL PRIMARY KEY,
    requester_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    offered_book_title TEXT NOT NULL,
    offered_book_course TEXT NOT NULL,
    condition_preference TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ
  );
  ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
  CREATE INDEX IF NOT EXISTS exchanges_listing_idx ON exchanges (listing_id);
  CREATE INDEX IF NOT EXISTS exchanges_requester_idx ON exchanges (requester_id);
  CREATE INDEX IF NOT EXISTS exchanges_requester_created_idx ON exchanges (requester_id, created_at DESC);
  CREATE TABLE IF NOT EXISTS exchange_review_events (
    id BIGSERIAL PRIMARY KEY,
    exchange_id BIGINT NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
    actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    old_status TEXT CHECK (old_status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
    new_status TEXT NOT NULL CHECK (new_status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS exchange_review_events_exchange_idx
    ON exchange_review_events (exchange_id, created_at DESC);
`;

app.use((error, req, res, next) => {
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request is too large. Payment proof files must be 5MB or smaller.' });
  }
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Request body is invalid JSON.' });
  }
  return next(error);
});

const start = async () => {
  if (pool) await pool.query(schema);
  app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  });
};

start().catch((error) => {
  console.error('Server startup failed:', error);
  process.exitCode = 1;
});
