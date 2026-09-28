# Secure Email Password Reset

## Objective

Add a "Forgot password?" flow to Campus Exchange login that sends a time-limited reset link
to the address entered, then lets the account owner choose a new password. Password recovery
must not change the account's role. In particular, `224732015@tut4life.ac.za` remains a
`STUDENT` unless separately promoted through the existing documented admin promotion
command.

Never use, reproduce, log, store, or ask the user to re-share the password they disclosed
in chat. Advise them to change it anywhere it was reused. Never include passwords, reset
tokens, or complete reset URLs in logs or API responses.

## Current implementation

- Next.js credentials authentication uses `client/components/AuthForm.tsx`, `client/auth.ts`,
  and `POST /api/auth/login`, which proxies to Express.
- Express stores bcryptjs password hashes in `users.password_hash`.
- Approved student email domains include `tut4life.ac.za`.
- The API already uses PostgreSQL and applies idempotent schema on server startup.
- `client/lib/api.ts` is the shared frontend fetch helper.
- `/login` is public; protected page matcher is in `client/proxy.ts`.
- Server package scripts are in `server/package.json`; no mail provider dependency exists.

## UX

- Add a visible "Forgot password?" link to the existing login page.
- Add a public `/forgot-password` form for the verified student email. Validate/normalize at
  the API boundary, but use the same generic success message regardless of whether the
  account exists or a reset email was sent.
- Add public `/reset-password?token=...` form with new password and confirmation, minimum
  eight characters consistent with current registration. Do not prefill or retain password
  values after submit.
- Show explicit loading, validation, generic success, expired/used-link, and service errors.
- On success, link back to login; do not automatically log in or change the account role.
- Use existing design system and accessible labels/focus states.

## API design

- `POST /api/auth/password-reset/request` accepts `{ email }`.
  - Always return the same generic success response for validly shaped requests, whether the
    address exists, has no account, is rate-limited, or the mail service is unavailable.
  - Send an email only for an existing eligible account; do not reveal account existence
    through response content or status.
  - Apply bounded per-email and per-client-IP throttling; store only a keyed/hash IP value
    with an appropriate server-side secret, not raw IPs.
- `POST /api/auth/password-reset/complete` accepts `{ token, password }`.
  - Validate token shape and new password length at the API boundary.
  - Consume exactly one unexpired unused token and update the password hash atomically.
  - Reject expired, invalid, and previously used tokens with a generic recovery error.
  - Clear relevant login lockout attempts after a successful reset.
  - Do not change role or other user profile fields.
- Add a server-only Next.js proxy route for each request to the Express API; do not expose
  `API_URL`, SMTP credentials, or database connection information to the browser.

## Token and database requirements

- Generate a cryptographically random, high-entropy, single-use token; email only the raw
  token in the link and persist only a cryptographic hash of it.
- Expire links after 30 minutes. Store user ID, token hash, expiration, creation time,
  consumed time, and minimal hashed/IP throttle metadata as required.
- Insert/consume/update inside appropriate transactions. A reset token can succeed exactly
  once, including in concurrent requests.
- Add indexes and idempotent schema creation. Prune expired/consumed reset records safely
  during request or a bounded cleanup operation.
- Prevent reset links from being generated from an untrusted `Host`/`Origin` header. Build
  them only from a configured canonical site URL; require HTTPS for non-local production
  origins.
- Consider active JWT sessions: define and implement whether reset invalidates existing
  access tokens; prefer invalidation if it can be done safely with the existing auth model.

## Email delivery

- Use a standard SMTP transport configured exclusively from server environment values (for
  example `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, and
  `APP_BASE_URL`). Never commit actual secrets.
- If a mail dependency such as Nodemailer is needed, add it to the server manifest and lock
  file using the package manager.
- Fail safely if SMTP is unconfigured or send fails. Keep the public response generic and
  record only a non-sensitive operational error; never log token, reset URL, password, or
  raw SMTP credentials.
- Email should identify Campus Exchange, explain that the request was for a password reset,
  include a clearly labeled reset button/link and 30-minute expiry, and tell the recipient to
  ignore the email if they did not request it.
- Do not send a password, disclose account role, or change account role through the email.

## Security and privacy

- Rate-limit request attempts and token completion attempts. Make account enumeration,
  brute-force, replay, timing, referrer leakage, and host-header poisoning difficult.
- Add `Referrer-Policy: no-referrer` on the reset page or otherwise ensure reset tokens are
  not sent as referrers to external resources.
- Ensure token never appears in app/server access logs, analytics, or client-side
  third-party requests; remove it from browser history after successful token parsing if
  compatible with Next.js routing.
- Use generic API errors and no success-shaped reset token fallback. Surface service failure
  in the UI without telling an unauthenticated requester whether an email exists.
- Keep every reset endpoint public by design but strictly bounded and independently
  validated. Do not weaken authorization on existing routes.

## Documentation and validation

- Update `README.md` with SMTP/site URL environment variable names and setup instructions,
  without real values. Update `AGENTS.md` auth/API/security contracts.
- Validate:
  1. Known and unknown addresses receive identical public API response shape/message.
  2. Valid known account receives a reset email only when SMTP is configured.
  3. Invalid, expired, replayed, and concurrently reused tokens cannot update password.
  4. New password works; old password fails; login lockout state is cleared.
  5. Reset leaves account role unchanged and does not reveal account existence/role.
  6. SMTP failure produces a generic public response and sanitized operational error.
  7. Rate limits, canonical host/HTTPS guard, and no-referrer behavior are effective.
  8. Reset routes/pages work while signed out; admin/client authorization remains unchanged.
- Run targeted frontend build/lint and backend syntax/checks. Report any live database/SMTP
  tests that cannot run due to missing connectivity or configuration.
