# CS-Secondhand-Textbook

Campus Exchange is a student-to-student secondhand textbook marketplace. Students submit a
book listing, transfer the R5 listing fee to the configured receiving account, and upload
proof in the portal. An admin verifies payment and separately reviews the book before it is
shown in Browse. R5 covers one 30-day listing period; renewal requires another manual
transfer and proof. The platform does not process payments between book buyers and sellers.

## Listing payment configuration

Set these values in the server's untracked environment file before enabling payment-proof
submission. Use the real account details belonging to the marketplace operator; do not
commit them to source control. When any value is missing, the seller flow explicitly blocks
proof submission.

```text
LISTING_PAYMENT_ACCOUNT_HOLDER=
LISTING_PAYMENT_BANK=
LISTING_PAYMENT_ACCOUNT_NUMBER=
LISTING_PAYMENT_ACCOUNT_TYPE=
```

The seller flow displays these values only to authenticated users. Uploads are limited to
JPEG, PNG, or PDF files up to 5 MiB, validated by file signature, stored as private database
data, and available only to server-authorized admins. Do not deploy real bank details or
payment-proof collection until the operator has reviewed the privacy, retention, fee/refund,
and marketplace terms with a qualified South African legal professional. The published
marketplace rules are product policy, not legal advice or a guarantee against lawsuits.

The Express server applies the listing workflow schema on startup. Existing active listings
are preserved as already paid and reviewed; they are not retroactively charged. Admin
listing review is available in the separate admin portal for accounts whose server-side
role is `ADMIN`.

## Admin control center

After the intended operator has registered through the normal account flow, promote that
existing account from an interactive server terminal:

```powershell
Set-Location server
npm run admin:promote -- operator@student.tut.ac.za
```

The command requires `DATABASE_URL` in the server environment and an exact interactive
confirmation. It does not create or reveal a password. The operator signs in at the normal
admin login page using the account's existing password. Never share a student account
password or create a shared default credential.

For local student-flow testing only, a new student account can be created with
`npm run seed:demo-student` from `server/`. Set `TEST_STUDENT_EMAIL` to an approved TUT
address and `TEST_STUDENT_PASSWORD` to a unique password of at least 12 characters in the
server environment first. The command creates an account only if that email is unused; it
does not modify an existing account. It never creates or promotes an admin account.

The separate admin application is in the repository-root `admin/` folder. Its dashboard,
listing review, report management, fee periods, and visitor analytics run independently of
the student marketplace in `client/`. The marketplace's student login remains at `/login`;
its **Admin login** link opens the admin application. Existing `/admin` links redirect to
the matching page in that application. Express APIs re-check the current database role;
revoking an account's ADMIN role blocks its next admin API request. Students and signed-out
users cannot read admin metrics, receipts, reports, or fee details.

The overview includes aggregate registered-user counts (including the last 30 days),
listing/review counts, report counts, R5 fee-period status, and visitor totals. The
"verified listing fees" value is a count-based estimate and is not bank reconciliation.
Admin abilities are limited to reviewing listings and payment proof, managing report
statuses, and viewing aggregate metrics/fee periods. It does not grant access to user
passwords, impersonation, private messaging, shipping, or buyer-to-seller payment handling.

## Exchange requests and safety reports

Only active, approved, unexpired listings marked for trade accept exchange requests.
Signed-in students can submit an offer from the listing page and track their outgoing
requests under **Book exchanges**. The listing owner sees incoming requests and may accept
or decline each pending request while the listing remains available. Accepting one request
automatically declines the other pending offers for that listing; marking it sold also
declines pending offers. Request status changes are audit-recorded. Offers are not a chat
channel: do not include contact or payment details, and arrange any exchange in a public
campus place during daylight.

Reports are submitted by signed-in students from a listing or seller page. The API derives
the reporter from the authenticated token, accepts one listing or user target, validates
the category and description, and limits duplicate/high-volume submissions. Reporter
identity and report review records are private to authorized admins. Admins manage report
statuses from the separate admin portal; student sessions cannot access that queue.

The Express startup schema adds the exchange response timestamp and audit table. Restart
the API after deploying server changes so its additive `CREATE TABLE IF NOT EXISTS` /
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` schema setup runs. Back up the database before a
production update; startup DDL is not a replacement for a versioned production migration
process.

## Running the separate admin portal

The student marketplace and private admin portal are separate Next.js applications. Start
the Express API as usual, then run the marketplace from `client/` on port 3000. In a
separate terminal, configure and start the admin app on port 3001:

```powershell
Set-Location admin
npm install
Copy-Item .env.example .env.local
npm run dev
```

Before signing in, set `API_URL` to the Express API origin, `NEXTAUTH_URL` to the admin
origin, and `NEXTAUTH_SECRET` to a unique random secret of at least 32 characters in
`admin/.env.local`. Generate a secret locally, for example:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Set `NEXT_PUBLIC_ADMIN_APP_URL` in the marketplace's `client/.env.local` to the admin
origin (locally, `http://localhost:3001`). `NEXT_PUBLIC_MARKETPLACE_URL` in the admin
environment may be set to the marketplace origin. Public URL variables are embedded at
build time; configure them for the deployed environment before building. Use HTTPS and
independent, private NextAuth secrets in production. Keep both apps' environment files
untracked and never reuse or commit a session secret. The admin app does not create an
administrator account: promote an existing account through the server-host command above.

The API applies a 15-minute per-IP rate limit to login and registration attempts. Login also
uses a database-backed failed-password lockout keyed by normalized email and client IP.

To run a production build of the admin app, use `npm run build` in `admin/`, then start it
with `npm start`. The marketplace has its own independent build and start commands in
`client/`.

## Password recovery email configuration

Password recovery sends a random, single-use link that expires after 30 minutes. Configure
SMTP and the canonical site URL in the server's untracked environment before enabling it:

```text
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
PASSWORD_RESET_BASE_URL=https://your-canonical-campus-exchange-host
PASSWORD_RESET_HASH_SECRET=
```

`PASSWORD_RESET_HASH_SECRET` must be a random secret of at least 32 characters and must
remain private. For local development only, the site URL may use `http://localhost` or
`http://127.0.0.1`; all other configured reset origins require HTTPS. SMTP credentials and
the reset hash secret must never be added to source control or sent through chat.

On the login page, use **Forgot password?**, enter the account email, and follow the reset
link delivered by the configured mail server. The portal returns the same confirmation for
valid existing and non-existing addresses. Successful reset changes only the password,
clears the relevant failed-login counter, and invalidates existing API access tokens. It
does not promote an account or change `STUDENT`/`ADMIN` role. The flow cannot send email
until SMTP, canonical URL, hash secret, and database configuration are reachable.

## Checks

Run the focused API validation tests and syntax checks from the repository root:

```powershell
Set-Location server
npm test
node --check server.js
node --check lib/marketplace-validation.js
```

Run the student and admin production builds independently:

```powershell
Set-Location client
npm run build

Set-Location ..\admin
npm run build
```

These checks do not replace role-separated integration verification against a configured
test database. In particular, verify exchange ownership decisions, private report access,
and admin denial for student accounts before a production release.
