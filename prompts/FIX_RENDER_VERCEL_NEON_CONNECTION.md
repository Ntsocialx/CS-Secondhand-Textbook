# Fix student login and database connection (Vercel client + Render API + Neon)

## Problem

- The deployed student client (Vercel) shows "Unable to sign in with those details." for every
  student account; only the admin account (run locally) can sign in.
- Neon has no `users` table (`relation "users" does not exist`). The Express server creates all
  tables on startup (`schema` in `server/server.js`), so the Render API has never started
  successfully against this Neon database.
- The deployed login page links "Admin login" to `http://localhost:3001`, which shows the
  Vercel project is missing its production environment variables (`NEXT_PUBLIC_*` values are
  baked in at build time).
- The student client falls back to `http://localhost:5000` when `API_URL` /
  `NEXT_PUBLIC_API_URL` are unset, so in production its login/register calls fail, and the
  form hides the cause behind one generic message.
- Registration posts from the browser straight to `NEXT_PUBLIC_API_URL`, while login goes through
  the server-side proxy using `API_URL`. Two variables must agree or accounts are created on one
  backend and looked up on another.
- Render API: `https://cs-secondhand-textbook.onrender.com`.
  Student client: `https://cs-secondhand-textbook-ze9k.vercel.app`.

## Manual configuration (owner does this; never paste secrets into chat or commit them)

Render (API service):
- `DATABASE_URL`: the Neon connection string for the intended project/branch/database
  (Neon dashboard > Connection details; keep `sslmode=require`).
- `JWT_SECRET`: a long random value.
- `NODE_ENV=production`.
- Check Render logs for `Server startup failed:`. A DB error there is the root cause of the
  empty Neon database. `GET /health` must return `databaseConfigured: true`.

Vercel (student client project), then redeploy:
- `API_URL` and `NEXT_PUBLIC_API_URL`: `https://cs-secondhand-textbook.onrender.com`
  (no trailing path).
- `NEXTAUTH_URL`: `https://cs-secondhand-textbook-ze9k.vercel.app`.
- `NEXTAUTH_SECRET`: newly generated random value (32+ characters).
- `NEXT_PUBLIC_ADMIN_APP_URL`: the admin app's real URL once it is deployed.

Admin accounts: the existing admin lives in a different database. After the API runs against
Neon, register the account normally, then run `npm run admin:promote -- <email>` from `server/`
with the Neon `DATABASE_URL` set locally.

## Code changes (smallest set)

1. `client/components/AuthForm.tsx`: send registration to the existing same-origin
   `/api/auth/register` proxy instead of `NEXT_PUBLIC_API_URL`, so registration and login both
   use the single server-side `API_URL`.
2. `client/auth.ts` and the proxy routes under `client/app/api/auth/`: in production, do not
   silently fall back to localhost when `API_URL` is missing; return a clear 503 instead.
   Preserve local-development defaults.
3. `client/auth.ts` and `AuthForm.tsx`: distinguish "service unreachable/unavailable" from
   "wrong email or password" so the form says "The sign-in service is unavailable. Try again
   shortly." when the API cannot be reached or returns 5xx. Do not reveal internal URLs.
4. `server/server.js`: set Express `trust proxy` for Render (configurable via env, default 1 in
   production) so rate limiting and lockout see the forwarded client address.

## Decision needed from the owner

Student logins reach Express from Vercel's servers, so the API sees one shared IP for all
students. The login rate limiter (5 failed attempts per 15 min per IP) and the lockout key
(`ip:email`) would then treat students as one client. Option A (recommended): forward the end
user's IP from the NextAuth `authorize` request headers through the proxy as `X-Forwarded-For`
(requires item 4). Option B: leave as is and accept the shared limit for now.

## Out of scope

No schema changes, new dependencies, hosting migration, or unrelated marketplace changes.

## Acceptance

- `GET https://cs-secondhand-textbook.onrender.com/health` reports `databaseConfigured: true`
  and the Neon `users` table exists after the API starts.
- A new `@student.tut.ac.za` account can register on the Vercel site, appears as a row in
  Neon `users`, signs out, and signs back in.
- Wrong password still shows "Unable to sign in with those details."; an unreachable API shows
  the service-unavailable message.
- `npm test` and `node --check server.js` pass in `server/`; `npm run build` passes in
  `client/`.
- Manual checks: protected routes while signed out, signed in as a student, and admin-only
  endpoints with a non-admin account still behave as before.
