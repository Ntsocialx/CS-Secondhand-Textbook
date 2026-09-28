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
listing review is available at `/admin/listings` for accounts whose server-side role is
`ADMIN`.

## Admin control center

After the intended operator has registered through the normal account flow, promote that
existing account from an interactive server terminal:

```powershell
Set-Location server
npm run admin:promote -- operator@student.tut.ac.za
```

The command requires `DATABASE_URL` in the server environment and an exact interactive
confirmation. It does not create or reveal a password. The operator signs in at the normal
Campus Exchange login page using the account's existing password. Never share a student
account password or create a shared default credential.

The admin workspace is at `/admin`, with listing review at `/admin/listings`, report
management at `/admin/reports`, fee periods at `/admin/fees`, and visitor analytics at
`/admin/analytics`. Server APIs re-check the current database role; revoking an account's
ADMIN role blocks its next admin API request. Students and signed-out users cannot read
admin metrics, receipts, reports, or fee details.

The overview includes aggregate registered-user counts (including the last 30 days),
listing/review counts, report counts, R5 fee-period status, and visitor totals. The
"verified listing fees" value is a count-based estimate and is not bank reconciliation.
Admin abilities are limited to reviewing listings and payment proof, managing report
statuses, and viewing aggregate metrics/fee periods. It does not grant access to user
passwords, impersonation, private messaging, shipping, or buyer-to-seller payment handling.

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
