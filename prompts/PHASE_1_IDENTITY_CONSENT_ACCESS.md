# Phase 1: Identity, Consent, and Access Control
## Sprint 1.1 + 1.2 Combined Implementation

### Overview
This phase delivers production-quality student authentication, POPIA consent management, cookie preferences, login abuse prevention, and protected marketplace route access control.

### Sprint 1.1: Registration and Login

#### Goals
- Deliver production-quality student registration and sign-in
- Validate student email domains (TUT: `student.tut.ac.za`, `tut.ac.za`)
- Hash passwords with `bcryptjs`
- Create secure JWT sessions
- Provide helpful validation errors

#### Deliverables

1. **Email Validation**
   - Accept only approved domains (TUT: `student.tut.ac.za`, `tut.ac.za`)
   - Case-insensitive normalization before checking duplicate
   - Clear error messages for invalid domains
   - Server-side validation at API boundary (never trust client-side only)

2. **Password Hashing**
   - Use `bcryptjs` with salt rounds ≥ 10
   - Never store plaintext passwords
   - Hash on registration and validate on login

3. **Session/Token Management**
   - Generate JWT access tokens on successful login
   - Token must include: user ID, email, role (STUDENT/ADMIN)
   - Signature must use environment variable `JWT_SECRET` (never commit)
   - Token expiry: 24 hours (extensible to refresh tokens in future)

4. **Helpful Validation Errors**
   - Email already registered → "This email is already registered. Try logging in instead."
   - Invalid domain → "Use your TUT student email (student.tut.ac.za or tut.ac.za)"
   - Short/weak password → "Password must be at least 8 characters"
   - Missing fields → List missing required fields
   - Server-side errors → Generic "Something went wrong" with opaque ID for logging

5. **API Endpoints** (Express)
   - `POST /api/auth/register`
     - Request: `{ email, password, tut_campus }`
     - Response: `{ success: true, token, user: { id, email, role } }` or error
     - Status: 201 on success, 400 on validation, 409 on duplicate
   - `POST /api/auth/login`
     - Request: `{ email, password }`
     - Response: `{ success: true, token, user: { id, email, role } }` or error
     - Status: 200 on success, 400 on validation, 401 on credentials
     - Trigger lockout after 5 failures (handled in Sprint 1.2)

#### Acceptance Criteria
- [ ] Invalid domains cannot register or log in
- [ ] Passwords are never stored in plaintext
- [ ] A valid TUT student can register with `student.tut.ac.za` or `tut.ac.za` email
- [ ] Duplicate accounts return HTTP 409 with user-friendly error message
- [ ] Login returns valid JWT token
- [ ] Session is not stored server-side (stateless JWT)
- [ ] Unauthenticated requests to protected endpoints return 401

---

### Sprint 1.2: Consent, Cookies, and Abuse Controls

#### Goals
- Persist POPIA consent and versioning
- Store cookie preferences
- Protect marketplace routes from unauthenticated access
- Implement 5-attempt/5-minute login lockout
- Design for production durable lockout state

#### Deliverables

1. **POPIA Consent Persistence**
   - Consent version (numeric, e.g., `1`) and timestamp recorded at registration or login
   - Required before registration can complete
   - Separate optional contact-display consent checkbox
   - Consent modal blocks marketplace navigation until accepted
   - Cannot use app without accepting required consent

2. **Cookie Preference Persistence**
   - Essential cookies (session) always set
   - Optional: analytics cookies (can be disabled)
   - Cookie preferences persisted in database with `user_id`
   - No client-side bypass of essential-only choice
   - SameSite=Lax on session cookie

3. **Protected Marketplace Routes**
   - Unauthenticated users redirected from:
     - `/marketplace` (browse)
     - `/my-listings`
     - `/sell`
     - `/exchange`
     - `/report`
   - Redirect to `/login` with `?from=<path>` so user is returned after login
   - Redirect happens on client before rendering protected component

4. **Login Lockout: 5 failures / 5 minutes**
   - Key: normalized email + client IP
   - Incremented on failed password attempt
   - Cleared on successful login
   - After 5 failures, return HTTP 429 with `Retry-After: 300` header
   - Show user: "Too many login attempts. Try again in 5 minutes."
   - Store in PostgreSQL `login_attempts` table (already exists):
     - `id`, `email`, `ip_address`, `attempt_count`, `last_attempt_at`
     - Cleanup: delete records > 5 minutes old on each login attempt

5. **Production Lockout Design**
   - Current implementation: in-memory state (**not production-ready**)
   - Future production path: migrate to Redis or database-backed rate limit
   - Design database schema to support distributed lockout state:
     - Include expiry timestamp so cleanup is predictable
     - Consider composite index on `(email, ip_address)` for fast lookups
     - Recommend documenting migration path in comments

6. **API Endpoint Updates**
   - `POST /api/auth/login` — add lockout check before password validation
     - Before: clear expired login attempts for this email+IP
     - Check: if attempt_count >= 5, return 429 immediately
     - On 5th failure: set `last_attempt_at` for expiry calculation
     - On success: delete row for this email+IP
   - `POST /api/auth/register` — require consent version
     - Request: `{ email, password, tut_campus, consent_version, contact_consent? }`
     - Response includes success + token or error
   - `POST /api/auth/consent` (optional, for consent versioning)
     - Allows user to update consent preferences post-registration
   - `POST /api/auth/cookies` (optional, for preference persistence)
     - Store `user_id` + analytics_enabled boolean

7. **Middleware: Token Validation**
   - Verify JWT on all protected routes (`/api/listings/*`, `/api/my-listings`, `/api/reports`, etc.)
   - Extract `user_id` and `role` from token
   - Return 401 if token missing or invalid
   - Attach `req.user` for downstream handlers

#### Acceptance Criteria
- [ ] Login and registration cannot proceed without POPIA consent acceptance
- [ ] Consent version and timestamp recorded in database
- [ ] Contact-display consent is optional and stored separately
- [ ] Unauthenticated users cannot access `/marketplace`, `/my-listings`, `/sell`, `/exchange`, `/report`
- [ ] Unauthenticated users are redirected to `/login?from=<path>`
- [ ] Five failed login attempts trigger 429 response with `Retry-After: 300` header
- [ ] Lockout message displays to user
- [ ] Successful login clears failure count
- [ ] Lockout expires after 5 minutes (expired records cleaned up on next attempt)
- [ ] Database schema documents production migration path for distributed lockout
- [ ] Protected API endpoints validate JWT and return 401 if missing/invalid
- [ ] Admin role is validated server-side only (not from client claims)

---

### Implementation Order
1. **Register/Login endpoints** with email validation + hashing
2. **JWT generation and validation middleware**
3. **POPIA consent modal and persistence**
4. **Cookie preference modal and storage**
5. **Protected route middleware** (client-side redirect + API 401 handling)
6. **Login lockout logic** (database-backed, 5 min expiry)
7. **Comprehensive testing** (valid domains, lockout, consent flow, protected routes)

### Testing Checklist
- [ ] Register with valid TUT email → success
- [ ] Register with invalid email → 400 with "Use your TUT student email"
- [ ] Register with duplicate email → 409 with "already registered"
- [ ] Password validation (< 8 chars, etc.) → 400 with specific error
- [ ] POPIA consent required → registration blocked if not accepted
- [ ] Login with valid credentials → JWT token in response
- [ ] Login attempt 1-4 → normal rejection
- [ ] Login attempt 5 → 429 with `Retry-After` header
- [ ] Wait 5 minutes or clear lockout manually → login works again
- [ ] Access `/marketplace` unauthenticated → redirect to `/login?from=/marketplace`
- [ ] Access `/api/listings` without token → 401
- [ ] Access `/api/listings` with valid token → allowed
- [ ] Non-admin accessing admin endpoint → 403 or 401

### Out of Scope (Phase 1)
- Real-time chat or notifications
- Email verification (future sprint may add)
- OAuth/SSO (use credentials provider only)
- Account recovery/password reset (future sprint)
- Two-factor authentication
