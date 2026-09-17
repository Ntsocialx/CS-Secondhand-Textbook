const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const POPIA_CONSENT_VERSION = '1.0';
const ALLOWED_EMAIL_DOMAINS = ['student.tut.ac.za', 'tut.ac.za', 'tut4life.ac.za', 'student.campus.edu'];
const LOGIN_FAILURE_LIMIT = 5;
const LOGIN_LOCKOUT_MS = 5 * 60 * 1000;
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

// Middleware
app.use(cors());
app.use(express.json());

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
  { sub: user.id, email: user.email, role: user.role },
  JWT_SECRET,
  { expiresIn: '8h' },
);

const authenticate = (req, res, next) => {
  if (!JWT_SECRET) {
    return res.status(503).json({ error: 'The authentication service is not configured.' });
  }
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required.' });
  return next();
};

app.post('/api/auth/register', async (req, res) => {
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

app.post('/api/auth/login', async (req, res) => {
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
  price: Number(body?.price),
  condition: String(body?.condition || '').trim(),
  description: String(body?.description || '').trim().slice(0, 2000),
  campus: String(body?.campus || '').trim().slice(0, 120),
  imageUrl: typeof body?.imageUrl === 'string' ? body.imageUrl.slice(0, 2_000_000) : null,
});

const validateListing = (listing) => {
  if (!listing.title || !listing.courseCode || !listing.campus || !listing.description) return 'Title, course code, campus, and description are required.';
  if (!Number.isFinite(listing.price) || listing.price < 0 || listing.price > 100000) return 'Price must be a valid amount between R0 and R100000.';
  if (!CONDITIONS.has(listing.condition)) return 'Choose a valid book condition.';
  if (listing.imageUrl && !/^https?:\/\/|^\/|^data:image\/(png|jpe?g|webp);base64,/.test(listing.imageUrl)) return 'The textbook image format is not supported.';
  return null;
};

app.get('/api/listings', authenticate, async (req, res) => {
  if (!requireConfiguration(res)) return;
  const values = [];
  const filters = ["status = 'ACTIVE'"];
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
  try {
    const result = await pool.query(
      `SELECT id, title, course_code AS "courseCode", price::text, condition, description, campus,
              image_url AS "imageUrl", status, created_at AS "createdAt", user_id AS "userId"
       FROM listings WHERE ${filters.join(' AND ')} ORDER BY created_at DESC`,
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
  try {
    const result = await pool.query(
      `SELECT u.email, u.phone, u.contact_display_consent
       FROM listings l JOIN users u ON u.id = l.user_id
       WHERE l.id = $1`,
      [req.params.id],
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Listing not found.' });
    const contact = result.rows[0];
    if (!contact.contact_display_consent) {
      return res.status(403).json({ error: 'Seller has disabled contact display.' });
    }
    return res.json({ contact });
  } catch (error) {
    console.error('Contact reveal failed:', error);
    return res.status(500).json({ error: 'Unable to retrieve contact details.' });
  }
});

app.get('/api/listings/:id', authenticate, async (req, res) => {

  if (!requireConfiguration(res)) return;
  try {
    const result = await pool.query(
      `SELECT l.id, l.title, l.course_code AS "courseCode", l.price::text, l.condition, l.description,
              l.campus, l.image_url AS "imageUrl", l.status, l.created_at AS "createdAt",
              u.id AS "userId", u.email AS "sellerEmail", u.phone AS "sellerPhone",
              u.contact_display_consent AS "contactDisplayConsent"
       FROM listings l JOIN users u ON u.id = l.user_id WHERE l.id = $1`,
      [req.params.id],
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Listing not found.' });

    const listing = result.rows[0];
    // Mask contact details for the general details page
    listing.sellerEmail = listing.sellerEmail.replace(/(?<=.{2}).(?=[^@]*?@)/g, "*");
    listing.sellerPhone = listing.sellerPhone ? listing.sellerPhone.replace(/\d(?=\d{4})/g, "*") : null;

    return res.json({ listing });
  } catch (error) {
    console.error('Listing lookup failed:', error);
    return res.status(500).json({ error: 'Unable to load the listing.' });
  }
});

app.get('/api/my-listings', authenticate, async (req, res) => {
  if (!requireConfiguration(res)) return;
  const result = await pool.query(
    `SELECT id, title, course_code AS "courseCode", price::text, condition, description, campus,
            image_url AS "imageUrl", status, created_at AS "createdAt"
     FROM listings WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.sub],
  );
  return res.json({ listings: result.rows });
});

app.post('/api/listings', authenticate, async (req, res) => {
  if (!requireConfiguration(res)) return;
  const listing = normalizeListing(req.body);
  const validationError = validateListing(listing);
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    const result = await pool.query(
      `INSERT INTO listings (user_id, title, course_code, price, condition, description, campus, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, title, course_code AS "courseCode", price::text, condition, description, campus,
               image_url AS "imageUrl", status, created_at AS "createdAt"`,
      [req.user.sub, listing.title, listing.courseCode, listing.price, listing.condition, listing.description, listing.campus, listing.imageUrl],
    );
    return res.status(201).json({ listing: result.rows[0] });
  } catch (error) {
    console.error('Listing creation failed:', error);
    return res.status(500).json({ error: 'Unable to publish the listing.' });
  }
});

app.patch('/api/listings/:id', authenticate, async (req, res) => {
  if (!requireConfiguration(res)) return;
  const listing = normalizeListing(req.body);
  const validationError = validateListing(listing);
  if (validationError) return res.status(400).json({ error: validationError });
  const result = await pool.query(
    `UPDATE listings SET title = $1, course_code = $2, price = $3, condition = $4,
      description = $5, campus = $6, image_url = $7, updated_at = NOW()
     WHERE id = $8 AND user_id = $9 AND status <> 'SOLD'
     RETURNING id, title, course_code AS "courseCode", price::text, condition, description, campus,
               image_url AS "imageUrl", status, created_at AS "createdAt"`,
    [listing.title, listing.courseCode, listing.price, listing.condition, listing.description, listing.campus, listing.imageUrl, req.params.id, req.user.sub],
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Listing not found or not editable.' });
  return res.json({ listing: result.rows[0] });
});

app.post('/api/listings/:id/sold', authenticate, async (req, res) => {
  if (!requireConfiguration(res)) return;
  const result = await pool.query(
    `UPDATE listings SET status = 'SOLD', updated_at = NOW()
     WHERE id = $1 AND user_id = $2 AND status = 'ACTIVE'
     RETURNING id, status`,
    [req.params.id, req.user.sub],
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Listing not found or already marked as sold.' });
  return res.json({ listing: result.rows[0] });
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

app.post('/api/reports', async (req, res) => {
  if (!requireConfiguration(res)) return;
  const { category, description, reporterEmail, listingId, userId } = req.body || {};
  if (!category || !description) {
    return res.status(400).json({ error: 'Category and description are required.' });
  }
  try {
    const reporterId = req.user ? req.user.sub : null;
    await pool.query(
      `INSERT INTO reports (reporter_id, reporter_email, listing_id, user_id, category, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [reporterId, reporterEmail || null, listingId || null, userId || null, category, description],
    );
    return res.status(201).json({ tracked: true });
  } catch (error) {
    console.error('Report submission failed:', error);
    return res.status(500).json({ error: 'Unable to submit the report.' });
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
  const { listingId, offeredBookTitle, offeredBookCourse, conditionPreference, notes } = req.body || {};
  if (!listingId || !offeredBookTitle || !offeredBookCourse) {
    return res.status(400).json({ error: 'Listing ID, offered book title, and course are required.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO exchanges (requester_id, listing_id, offered_book_title, offered_book_course, condition_preference, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [req.user.sub, listingId, offeredBookTitle, offeredBookCourse, conditionPreference, notes],
    );
    return res.status(201).json({ exchangeId: result.rows[0].id });
  } catch (error) {
    console.error('Exchange request failed:', error);
    return res.status(500).json({ error: 'Unable to post exchange request.' });
  }
});

app.get('/api/reports', authenticate, requireAdmin, async (req, res) => {

  if (!requireConfiguration(res)) return;
  try {
    const result = await pool.query(
      `SELECT r.*, u.email AS reporter_email, l.title AS listing_title, us.email AS reported_user_email
       FROM reports r
       LEFT JOIN users u ON u.id = r.reporter_id
       LEFT JOIN listings l ON l.id = r.listing_id
       LEFT JOIN users us ON us.id = r.user_id
       ORDER BY r.created_at DESC`,
    );
    return res.json({ reports: result.rows });
  } catch (error) {
    console.error('Reports retrieval failed:', error);
    return res.status(500).json({ error: 'Unable to load reports.' });
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
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
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SOLD')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
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
  CREATE TABLE IF NOT EXISTS exchanges (
    id BIGSERIAL PRIMARY KEY,
    requester_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    offered_book_title TEXT NOT NULL,
    offered_book_course TEXT NOT NULL,
    condition_preference TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS exchanges_listing_idx ON exchanges (listing_id);
  CREATE INDEX IF NOT EXISTS exchanges_requester_idx ON exchanges (requester_id);
`;

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
