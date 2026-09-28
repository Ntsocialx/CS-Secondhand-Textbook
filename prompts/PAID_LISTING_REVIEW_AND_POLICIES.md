# Paid Listing Submission, Review, and Marketplace Policies

## Objective

Add a responsive, classified-style book marketplace flow inspired by the information
hierarchy of Gumtree: prominent search and "List a book" actions, practical filters, clear
result counts/sorting, and scannable listing cards. Use the existing Campus Exchange visual
system and original copy/assets; do not copy Gumtree branding, exact layouts, text, or assets.

Students must be able to submit a book for sale or exchange, pay a manual listing fee of
R5 per listing for one 30-day listing period, and upload proof of payment. An authorized
admin must verify the payment and separately review the listing against the marketplace
rules before it becomes visible in browse/search.

This is a separately approved scope expansion of the current product boundary. It is a
manual bank-transfer process only: do not add an online payment gateway, card collection,
automatic recurring payments, or payment processing.

## Current implementation context

- The sell form at `client/app/sell/page.tsx` posts directly to `POST /api/listings`.
- `server/server.js` currently inserts listings as publishable records, and public browse
  queries select `status = 'ACTIVE'`.
- The admin area currently has visitor analytics at
  `client/app/admin/analytics/page.tsx`; the API already has an `ADMIN` role guard.
- Listing data is persisted in PostgreSQL; schema setup and incremental migrations live in
  `server/server.js` and `server/migrate_*.js`.
- Frontend requests must use `client/lib/api.ts`. Do not connect the Next.js app directly to
  PostgreSQL.
- There are existing user worktree changes in `client/app/globals.css`, `client/app/layout.tsx`,
  `client/app/page.tsx`, and an untracked `prompts/REDESIGN_CAMPUS_EXCHANGE_HOME.md`. Preserve
  them; do not revert or overwrite them.

## Fee and payment behavior

- Charge R5 for each listing submission, per 30-day listing period. Sale and exchange
  listings follow the same fee and review workflow.
- Do not collect or store bank login credentials, card details, or other unnecessary
  payment credentials. Students make the transfer outside the platform and upload a
  payment receipt/proof.
- Display receiving-account instructions from configuration, not hard-coded source values
  or seeded personal bank data. Never commit real bank/account details. If the required
  account configuration is absent, show an explicit unavailable state and prevent users
  from submitting proof as if payment instructions had been provided.
- Require an identifiable payment reference (listing ID or server-issued reference) that
  admins can use to reconcile the proof. Explain the reference on the payment instructions.
- The student selects an allowed receipt file and submits it to a protected API endpoint.
  Validate file type, size, authorization, and association to the authenticated user's own
  pending listing on the server. Do not trust browser-supplied MIME type alone.
- Store proof privately, never under Next.js `public/` or another publicly served directory.
  Do not include proof bytes, private storage URLs, account information, or uploader details
  in public listing responses, logs, analytics, or other users' views. The admin can access
  proof only through an authenticated, server-side `ADMIN`-guarded workflow.
- Tell users not to upload unrelated bank statements or expose unnecessary transaction
  details; allow appropriate redaction so long as the reference, amount, recipient, and
  payment date needed for verification remain readable.
- No automatic debit, recurring collection, or payment-provider integration. A seller must
  manually submit a new payment proof for each renewal.
- Start the 30-day active period when an admin approves both payment and listing content.
  Expired listings must no longer appear publicly. Show renewal/expiry status to the owner.

## Review and listing lifecycle

Keep payment verification and content moderation as distinct auditable decisions. Use
server-enforced states, with an intentional transition model such as:

1. Draft / payment required
2. Payment proof submitted / awaiting payment verification
3. Payment rejected (reason shown; owner may resubmit proof)
4. Payment verified / awaiting content review
5. Content rejected (reason shown; owner may edit and resubmit for review)
6. Approved and active (only state visible in public browse/search)
7. Expired, sold, or withdrawn

The server must reject invalid transitions. A client cannot set payment status, moderation
status, activation/expiry timestamps, owner ID, or admin decision fields. Admin decisions
must be server-side authenticated and recorded with admin identity, time, decision, and
reason. Do not let edits to an active listing silently bypass moderation: changes to
moderated fields return the listing to review before being public again.

Provide a protected admin queue to inspect listing fields, uploaded proof, policy checklist,
and seller-supplied context. Payment approve/reject and content approve/reject actions must
be distinct. Rejections require a useful reason; owners can see their own status/reason and
resubmit. Keep a clear audit trail. Only `ADMIN` may access review queues or make decisions.

## Marketplace rules and policy UX

Create concise, plain-language marketplace rules, link them from the sell form, and require
the seller to acknowledge them before submission. Include a checklist for both sellers and
reviewers covering at least:

- Only genuine, lawfully owned physical books may be listed; no photocopied, pirated,
  counterfeit, stolen, or otherwise unauthorized copies.
- Listings must accurately describe title/edition, condition, images, price or requested
  exchange, and campus; no unrelated goods, misleading claims, or prohibited content.
- Users must not post another person's private information or use the marketplace for scams,
  harassment, discrimination, or unlawful activity.
- Sale and exchange arrangements are between students; the platform does not take payment
  for books, guarantee a transaction, or arrange delivery. Encourage public, safe on-campus
  meetups and inspection of the book.
- Provide a way to report a listing or user and explain that reports may lead to review,
  removal, or account action consistent with published rules.
- Explain fee, 30-day duration, review/approval requirement, renewal process, and what
  happens when proof or content is rejected in plain language before the user submits.

Do not claim that policy text guarantees legal compliance or prevents lawsuits. This is
product policy copy, not legal advice. Keep legal terms, refund/fee handling, retention and
deletion rules, and final policy wording clearly marked for owner/legal review before public
launch. Do not invent a bank account, refund promise, statutory right, or legal conclusion.
Record a policy version and the user's acknowledgement time with the submission.

## Gumtree-inspired information architecture

- Use a clear header/navigation with a prominent search field and primary "List a book"
  action.
- Show category, campus/location, condition, sale/exchange, and price filters where useful;
  results count and sort control should be visible.
- Use responsive cards with legible book image, title, price or exchange label, condition,
  campus, and current availability/moderation-safe status.
- Keep moderation/payment workflow out of public results. The owner dashboard may display
  pending/rejected/expiry states; public visitors see approved active listings only.
- Maintain keyboard access, visible focus, useful empty/loading/error/success states, and
  mobile usability.

## Architecture, security, privacy

- Keep Next.js and Express separate. Use shared frontend API helpers.
- Validate and normalize every field at the Express API boundary and use parameterized SQL.
- Enforce student ownership and admin authorization in the API, not only the UI.
- Restrict uploads by allowlisted formats (at minimum JPEG, PNG, and PDF), maximum size,
  safe generated storage keys, and content inspection. Never trust a supplied file name or
  path; prevent path traversal and public URL guessing. Return generic errors without
  disclosing storage internals.
- Select a private storage approach appropriate for the current deployment; document any
  production storage configuration requirement. Do not add an online payment library or
  unnecessary UI/state library.
- Minimize receipt retention and personal data. Document the configurable retention rule
  and provide admin-only deletion/cleanup behavior if in scope for the selected storage.
- Preserve existing authentication, consent, listing, and safe-meetup behavior.

## Proposed API contract (keep synchronized with implementation)

- `POST /api/listings` — authenticated student creates a non-public pending listing.
- `POST /api/listings/:id/payment-proof` — authenticated owner uploads proof for their own
  pending listing.
- `GET /api/my-listings` — authenticated owner sees their own listings, separate
  payment/moderation state, rejection reason, and expiry metadata (never receipt data).
- `GET /api/admin/listings/review-queue` — authenticated `ADMIN` views pending payment and
  content reviews, with receipt access gated to the admin workflow.
- `POST /api/admin/listings/:id/payment-review` — `ADMIN` records payment verification or
  rejection and reason.
- `POST /api/admin/listings/:id/moderation-review` — `ADMIN` approves or rejects content
  and records reason/checklist result.
- `GET /api/listings` and `GET /api/listings/:id` — return approved, active listings only;
  never expose proof or private payment/admin fields.
- Document any separate protected receipt retrieval/delete route if needed.

## Data and migration expectations

- Use an additive, idempotent PostgreSQL migration for payment-proof metadata, separate
  payment/moderation status, policy version/acknowledgement, decision audit data, and
  activation/expiry metadata.
- Keep model small; use a payment-proof record or equivalent private metadata structure.
  Do not place receipt bytes in the listings row unless the current deployment has a
  justified, tested private storage strategy for that design.
- Avoid breaking existing records. Define how existing active listings are treated; do
  not silently hide or retroactively charge for them without owner approval.
- Update `AGENTS.md` data model and API contracts when routes/schema are implemented.

## Validation and test checklist

- Test unauthenticated submission and uploads are rejected.
- Test a student cannot upload proof for, inspect, or edit another student's listing.
- Test only an admin can review, retrieve proof, or change review states.
- Test invalid file type/size/content, forged MIME, malformed IDs, and invalid state
  transitions fail explicitly.
- Test paid but unreviewed and rejected listings never appear in browse or detail endpoints;
  only approved active and unexpired listings are public.
- Test edits/resubmissions return to the correct review state and preserve audit history.
- Test expiry hides listings, owner views show actionable status, and renewals require a
  fresh manual payment proof.
- Test that response payloads, browser-visible URLs, and logs contain no receipt or private
  account information.
- Verify signed-out and student access to protected routes, plus admin review behavior.
- Run available server/frontend checks and provide exact manual test steps.
