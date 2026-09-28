# Admin Control Center

## Objective

Create a dedicated Campus Exchange admin control center in the existing `client/app/admin/`
route area so an authorized operator can see marketplace totals, review listing/payment
submissions, manage reports, and monitor the R5 per-listing 30-day fee periods.

Students and signed-out users must not access the admin page or its data/actions. Enforce
authorization in Next.js routing/UI and independently in every Express admin API. Treat the
existing role as authoritative only when the server confirms that the account is currently
an `ADMIN`; do not trust a client-supplied role.

## Existing implementation

- Express auth stores `role` in the signed JWT; users are registered as `STUDENT`.
- `requireAdmin` currently checks the token role.
- The admin frontend already has:
  - `client/app/admin/analytics/page.tsx` for visitor analytics.
  - `client/app/admin/listings/page.tsx` for payment/content review.
- Express provides:
  - `GET /api/admin/listings/review-queue`
  - `GET /api/admin/listings/:id/payment-proof`
  - `POST /api/admin/listings/:id/payment-review`
  - `POST /api/admin/listings/:id/moderation-review`
  - `GET /api/reports` (read-only)
  - `GET /api/analytics/summary` (visitor counts only)
- Report rows have `OPEN`, `REVIEWED`, and `RESOLVED` statuses, but no admin status-update
  endpoint/audit log exists.
- R5 listing fees are manual transfers, not a recurring subscription product. `listings`
  hold `payment_status`, `moderation_status`, `expires_at`; proof bytes remain private in
  `listing_payment_proofs`.
- Express and Next.js stay separate; frontend data access goes through `client/lib/api.ts`.
- Preserve any existing worktree changes. Do not revert unrelated user edits.

## Admin account provisioning and credentials

- Do not hard-code, seed, print, or publish a shared/default admin password or JWT secret.
- Add a documented server-host-only CLI script that promotes an already registered,
  verified owner account by normalized email after an explicit interactive confirmation.
  It must require `DATABASE_URL`, use a parameterized update, and fail clearly if the user
  does not exist. It must never echo passwords or credentials.
- The operator then signs in at the normal login page using that account's own existing
  password; do not introduce a second password system or expose credentials to marketplace
  clients. Document exact promotion and login steps without putting secrets in source
  control. A deployment operator may add an account by the established registration process
  before promoting it.
- A signed-in `STUDENT` must receive no admin page data and every admin API call must return
  HTTP 403, even if the browser manually calls the endpoint. Signed-out requests must return
  HTTP 401 / redirect to sign-in.
- Make role revocation effective server-side for subsequent requests: admin authorization
  should check the current database role (or use an equivalently robust revocation mechanism),
  not rely indefinitely on the role claim cached in an eight-hour access token.

## Control center UX

- Add `/admin` as a control-center landing page with navigation to Overview, Listing Reviews,
  Reports, and Fee Periods. Keep the existing listing review UI integrated rather than
  duplicating its actions.
- Match the current Campus Exchange design language and remain responsive/accessibility
  aware.
- Display loading, empty, success, and useful error states.
- Show aggregate metrics only on the overview; avoid exposing unnecessary student personal
  data or receipt content there.
- Include an "Admin privileges" panel that truthfully enumerates the implemented,
  server-enforced abilities and the boundaries: review listing/payment submissions, inspect
  private proof, manage report status, view aggregate user/listing/fee/visitor counts.
  Explicitly state that the dashboard does not provide book transaction payments, user
  password access, arbitrary impersonation, private messaging, or delivery controls.

## Overview metrics

Add `GET /api/admin/overview` guarded by server-verified admin access. Return aggregate,
minimum-necessary counts:

- Total registered users and registration count in the last 30 days.
- Total active, pending payment, pending content review, rejected, sold, and expired
  listings.
- Open/reviewed/resolved report counts.
- Verified listing payments and active 30-day fee periods; pending/rejected proof counts.
- Confirmed R5 listing-fee amount only as an administrative count/estimate based on
  verified proofs, clearly labeled as "verified listing fees" and not bank reconciliation
  or guaranteed received revenue.
- Existing visitor and unique visitor totals where available.

Use parameterized SQL and one database snapshot/transaction for internally consistent
counts if reasonable. Do not return individual emails, phone numbers, receipt data, or IP
hashes in the overview. Handle empty database and missing storage configuration clearly.

## Reports management

- Extend the existing admin Reports area so admins can list/filter reports by status and
  mark them `REVIEWED` or `RESOLVED`.
- Add a `PATCH /api/admin/reports/:id` endpoint guarded by current-admin authorization;
  validate ID/status and allow only the documented transitions.
- Persist an audit row for each state change with report ID, admin ID, old/new status,
  optional concise internal note, and timestamp. Keep reporter identity private from other
  users and out of public APIs; it may be visible to authorized admins only if required to
  investigate.
- Never log report body, reporter email, or other personal data.

## Fee periods and requests

- Add an admin view/table for fee periods with listing ID/title, seller identity only as
  needed for support, fee status, review state, created/expiry timestamps, and rejection
  reasons; do not show proof bytes by default. A receipt is opened only through the existing
  explicitly admin-guarded route.
- Present this accurately as "Listing fees & periods" or "R5 fee subscriptions" with
  unambiguous copy that this is one manually paid fee per listing per 30-day period, not an
  automatic recurring subscription. There is no auto-renewal or online payment.
- Make pending listing submissions link to the current payment/content review queue.
- Do not add admin acceptance/decline controls for peer-to-peer exchanges; the product is
  not an exchange logistics or transaction-management service.

## Authorization and data integrity

- Update API authentication/admin middleware to recheck current user role from PostgreSQL
  server-side for admin routes. Preserve generic auth failures; log no credentials.
- Protect `/admin` route at middleware and page level, but never consider frontend hiding a
  substitute for backend authorization.
- Add current-admin guards to all overview, listing review, proof, report-management,
  analytics, and fee-period APIs.
- Do not expose proof storage keys/bytes or sensitive fields in public listing, browse,
  report, or overview responses.
- Use transactions for report status + audit writes. Use parameterized SQL throughout.
- Add only additive, idempotent schema changes and indexes.

## Documentation and test requirements

- Update `AGENTS.md` API contracts/data model/security and `README.md` with the admin setup
  command, normal-login process, route, metrics, privilege limits, and configuration
  requirements. Do not include real credentials.
- Validate:
  1. Signed-out user cannot load `/admin` or call any admin API.
  2. Authenticated `STUDENT` sees no admin data and gets 403 from every admin route.
  3. A promoted admin can load overview, listing review, report management, and fee periods.
  4. Demoting an admin account invalidates its admin API access without waiting for the JWT
     to expire.
  5. Report status validation and audit insertion work, including invalid IDs/states.
  6. Overview totals match direct test fixtures and expose no personal fields.
  7. Fee-period copy does not imply recurring payments, and private receipt bytes remain
     protected.
- Run available build/lint/syntax checks and report any database-dependent tests that could
  not be run because no configured test database is available.
