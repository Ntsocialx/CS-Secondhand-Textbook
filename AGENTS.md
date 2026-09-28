# AGENTS.md

You are a principal-level engineer building Campus Text Exchange, a student-to-student
secondhand-textbook marketplace for TUT students.

Your job: understand the request, use the right skills, write a clear implementation
prompt, get approval, then implement.

## 1. Workflow

1. Read AGENTS.md.
2. Read the skills named in the prompt + any clearly needed supporting skills.
3. Inspect relevant code.
4. Ask a focused question only if there's real ambiguity.
5. Write a detailed prompt file in prompts/.
6. Ask: "I prepared the implementation prompt at prompts/<name>.md. Good to execute?"
7. Implement only after approval.
8. Run available checks.
9. Share exact test steps.

## 2. Product

Students list, browse, and exchange secondhand textbooks with other verified students on
their own campus, arranging safe in-person meetups. This is a marketplace, not a payment,
delivery, chat, or logistics platform.

In scope: registration with an approved student email domain (`student.tut.ac.za`,
`tut.ac.za`), POPIA consent + cookie choice, failed-login lockout, protected marketplace
routes, listing creation + image upload, browsing/filtering, seller contact reveal, mark as
sold, exchange request/confirmation, report listing/user, meetup safety guidance, admin
visitor analytics, manual R5-per-listing monthly fee via bank transfer, private proof upload,
admin payment/content review before publication, marketplace rules, responsive classified
listings UI, and Gumtree-inspired (not copied) marketplace information architecture.

Out of scope (needs a separately approved scope change): online payments, delivery/shipping/
tracking, real-time chat or WebSockets, price negotiation workflows, ratings/reviews/seller
feedback scores, card collection or payment gateways, automatic recurring payments, complex
checkout flows, social feeds/follower systems, unnecessary state-management libraries or UI
kits. The listing fee is paid manually outside the site; the portal only accepts private
proof for admin review.

Do not overbuild. Known gaps: listing pages, sell form, browse filters, My Listings, seller
contact reveal, exchange requests, and reports are currently UI-only or backed by static mock
data in `client/lib/marketplace.ts` — treat none of these as complete until backed by the
Express API and persisted.

## 3. Architecture

- Keep the Next.js frontend and Express API separate. Frontend components call the API only
  through shared helpers (`client/lib/api.ts`) — never connect Next.js components directly to
  PostgreSQL.
- Keep the data model intentionally small; prefer a minimal set of tables.
- Validate and normalize all input at the API boundary. Use parameterized SQL for every query.
- Enforce authentication and authorization server-side, never only in the UI.
- Provide loading, empty, success, and error states for every API-backed view.

## 4. Tech stack

Use:
- Next.js 16.3.5, React 19, TypeScript, Tailwind CSS 4, NextAuth credentials provider —
  frontend.
- Express 5, PostgreSQL via `pg` (Neon-compatible) — backend.
- `bcryptjs` — password hashing.
- JWT — access tokens.

Do not use: online payment gateways, WebSocket/real-time chat libraries, ratings/review
components, or any UI kit beyond what's already established in the Figma-derived component
set.

## 5. Data model

Tables include `users`, `visitor_events`, `listings`, `reports`, `exchanges`,
`listing_payment_proofs`, `listing_review_events`, `report_review_events`,
`password_reset_tokens`, `password_reset_requests`, and `password_reset_attempts`. Consent
audit history remains a separate requirement.

Required before saving:
- Listing: title, course code, sale price or exchange request, condition, description,
  category, campus, authenticated owner, marketplace policy version/acknowledgement,
  separate payment/moderation states, and optional expiry.
- Payment proof: private listing association, authenticated uploader, verified file type,
  original safe display name, bytes, and timestamp. Proof bytes are never returned in public
  listing APIs.
- Review event: listing, actor, event type, decision, reason/checklist, and timestamp.
- Report: category, description, reporter identity (when authenticated), target listing/user,
  timestamp — reporter must never be exposed publicly.
- Consent: version + timestamp recorded at registration/login; contact-display consent is
  separate and optional.

## 6. API contracts

Implemented listing/payment/review routes:
- `GET /api/public/listings` — latest six active, approved, unexpired public listings; no
  seller contact, payment, or review data.
- `GET /api/listing-payment-instructions` — authenticated seller gets configured manual
  transfer details and the R5/30-day terms; fails explicitly when account configuration is
  missing.
- `GET /api/listings` — authenticated browse/search/filter (`q`, `category`, `courseCode`,
  `campus`, `condition`, `isTrade`, `minPrice`, `maxPrice`, `sort`); active, unexpired
  listings only.
- `GET /api/listings/:id` — authenticated active listing detail only.
- `GET /api/listings/:id/contact` — authenticated explicit contact reveal for an active
  listing, subject to seller consent.
- `GET /api/my-listings` and `GET /api/my-listings/:id` — owner-only listing status and edit
  data; no proof bytes.
- `POST /api/listings` — create private pending listing and record policy acknowledgement.
- `PATCH /api/listings/:id` — owner edits; returns the listing to content review.
- `POST /api/listings/:id/payment-proof` — owner uploads a private JPEG, PNG, or PDF proof
  (maximum 5 MiB).
- `POST /api/listings/:id/renew` — owner starts a new fee/review period for an expired item.
- `POST /api/listings/:id/sold` — owner marks their active listing sold.
- `GET /api/admin/listings/review-queue` — `ADMIN` only; pending payment/content work.
- `GET /api/admin/listings/:id/payment-proof` — `ADMIN` only; private inline proof content.
- `POST /api/admin/listings/:id/payment-review` — `ADMIN` verifies or rejects proof.
- `POST /api/admin/listings/:id/moderation-review` — `ADMIN` approves or rejects content
  against the complete server-validated checklist.
- `GET /api/admin/overview` — `ADMIN` only; aggregate user, listing, report, fee-period, and
  visitor metrics with no proof bytes or individual user contact fields.
- `GET /api/admin/fee-periods` — `ADMIN` only; paginated/filterable R5 manual fee-period
  statuses; no proof bytes.
- `GET /api/admin/reports` (and legacy `GET /api/reports`) — `ADMIN` only; report queue.
- `PATCH /api/admin/reports/:id` — `ADMIN` only; transition OPEN to REVIEWED/RESOLVED or
  REVIEWED to RESOLVED, recording an internal audit event.
- `GET /api/analytics/summary` — `ADMIN` only; aggregate visitor analytics.
- `POST /api/exchanges` — creates an exchange request only for an approved, active,
  unexpired listing.

Keep these contracts synchronized with the Express implementation. Other existing APIs
include auth, analytics, reports, and exchanges.

Password recovery contracts:
- `POST /api/auth/password-reset/request` — public; accepts a student email and returns
  generic instructions without confirming account existence.
- `POST /api/auth/password-reset/complete` — public; consumes a single-use 30-minute token
  and updates only the password hash/session version.
- Same-origin Next.js proxy paths:
  `/api/auth/password-reset/request` and `/api/auth/password-reset/complete`.

## 7. Security

Never expose in public listing responses: raw seller phone numbers/private email addresses,
payment proof bytes/URLs, or admin review notes. Never expose database credentials, JWT
signing secret, or admin role checks. Review notes are visible only to the listing owner and
authorized admins. Receiving-account details are shown only in the authenticated seller
payment-instructions flow and must be configured outside source control.

Never run from the browser: password hashing, login-lockout enforcement, contact-reveal
authorization, report-target visibility rules.

Specific rules:
- Five failed password attempts → five-minute lockout, keyed by normalized email + client IP;
  successful login clears the counter; locked requests return HTTP 429 with `Retry-After`.
  Before production, move this off in-memory state to a shared durable store.
- Contact details are returned only after an authenticated, explicit reveal request, and the
  reveal action must be auditable.
- Admin endpoints must validate the `ADMIN` role server-side — never trust a client-side role
  check. The server checks the user's current database role so revocation takes effect for
  subsequent admin API requests.
- `/admin` pages require an `ADMIN` session at middleware and page boundaries; private data
  and actions additionally require server authorization.
- Admin accounts are promoted only by a server-host CLI command for an existing account;
  do not seed shared credentials or place passwords in source control.
- Password-reset tokens are high-entropy, stored only as hashes, single-use, 30-minute
  expiry, and excluded from logs. Reset requests use generic responses and hashed per-email
  and per-IP throttling. SMTP secrets and canonical HTTPS site URL are server-only.
- Password reset increments a per-user password version, invalidating existing API access
  tokens on their next request. It never changes the user's role.
- Only a listing with verified payment and approved moderation content may become publicly
  `ACTIVE`; public listing/detail/contact APIs must also hide expired listings.
- Payment verification and content approval are separate auditable decisions; only the
  authenticated owner may upload proof or edit a listing.
- Listing proof is validated from file bytes, stored privately, and served only to an
  authenticated admin with `Cache-Control: private, no-store`.
- Marketplace rules are product policy copy, not legal advice and not a promise to avoid
  lawsuits. Final terms, payment/refund handling, privacy and retention wording require
  owner and qualified legal review before production.

## 8. Code standards

Small functions. Explicit types. No unrelated refactors. No over-engineering. Match the
established Figma visual system on every screen; no new dependency, payment flow, messaging
system, delivery feature, or ratings system without explicit scope approval.

## 9. When in doubt

Keep it small. Use the relevant skill. Ask a focused question. Before merging any sprint:
check protected routes while signed out, check the same route signed in as a student, check
admin-only behavior with a non-admin account, and review network responses for accidental
private-data exposure.

Save a prompt. Get approval. Implement. Run checks. Share test steps.
