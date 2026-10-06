# Complete Remaining Campus Exchange MVP Phases

## Objective

Audit and correct the authoritative root `AGENTS.md`, then finish the remaining Phase 3
and Phase 4 work in `PROJECT_CONTRACT.md` without regressing the marketplace, the independent
admin application, or existing account security. Phase 0–2 behavior is already partially
implemented; inspect and verify it rather than rebuilding it.

The project owner confirmed that a listing owner may accept or decline incoming exchange
requests and the requester must be able to see the resulting status.

## Audit findings to resolve

- Root `AGENTS.md` currently says several already API-backed listing, seller, exchange, and
  report surfaces are UI-only/static; this does not match the current routes and application.
- Its student-email domain summary and the current Express/frontend validation need to be
  reconciled with the approved TUT-only product policy without accidentally changing signup
  compatibility.
- The older `PROJECT_CONTRACT.md` implementation baseline and known-gap list predate current
  listing-fee/moderation, password-reset, and split admin-app work. Update status documentation
  based on verified behavior, not assumptions.
- `server/package-lock.json` currently fails JSON parsing (near line 32). Restore a valid lock
  file consistent with `server/package.json` and verify a clean lockfile install.
- `POST /api/reports` currently does not use authentication middleware and trusts request
  body reporter/target values; replace this with the authenticated, validated report contract.
- `/exchange` and `/exchange/confirmation` currently redirect to Browse while the Express
  create-request endpoint exists. Complete the user-facing persisted flow and status views.

## Phase 3 — Safe student exchange

### Protected contact reveal

- Preserve the current protected, consent-aware contact endpoint.
- Verify public listing and detail endpoints never disclose raw seller email or phone.
- Record successful reveals in the existing audit event table and never log contact data.
- Improve the marketplace UI for seller-disabled contact, request failure, successful reveal,
  and meetup-safety guidance. Pass target listing/user IDs into report forms from the
  relevant pages.

### Persisted exchange request and status flow

- Implement the exchange request and confirmation pages instead of redirect placeholders.
- Only allow authenticated students to request exchange on a valid, active, unexpired,
  approved listing that is offered for trade. Prevent a requester from requesting their own
  listing and reject malformed/oversized values.
- Persist request records; expose only appropriate requests to the requester and listing
  owner, with no proof bytes, private contact data, or unrelated user information.
- Provide owner-authorized accept/decline actions for pending requests. Record status/audit
  data and prevent invalid transitions, duplicate pending requests, self-dealing, or requests
  for sold/expired listings.
- Show the requester current status after refresh and give both parties clear completion and
  safe-meetup guidance. Do not add chat, negotiation, payment, delivery, or notification
  systems.

### Reports and safety

- Require a valid authenticated session for report submission, derive reporter identity only
  from the verified API token, and never trust client-supplied reporter IDs/emails.
- Validate category against the published list; validate description length, target IDs, and
  that exactly one valid listing/user target is supplied. Use parameterized SQL.
- Add repository-standard durable abuse controls or a defensible per-user/IP duplicate policy
  for report spam; return actionable validation/rate-limit errors.
- Keep reports private to authorized admins; keep reporter identity hidden in all student
  and public endpoints. Preserve the existing admin report review/audit path.
- Make the report UI show loading, success, validation, network, and rate-limit states and
  include contextual target IDs. Keep safety language focused on public, daytime campus
  meetups and product guidance (not legal guarantees).

## Phase 4 — Administration, quality, and handover

### Admin operations and auditability

- Verify that the independent `admin/` app's pages and server-side API proxy are protected
  by a real ADMIN session and that Express revalidates current database roles.
- Preserve visitor analytics as aggregates/salted IP hashes only.
- Ensure contact reveal, exchange status transitions, listing sold/review decisions, and
  report status transitions have actor/timestamp audit records where specified.
- Ensure admin failures and empty states are visible and actionable; avoid leaking private
  records in marketplace responses or logs.

### Tests, accessibility, and hardening

- Add focused automated tests for report input/auth/privacy, exchange ownership and state
  transitions, contact consent, listing sold/expiry behavior, and admin authorization.
- Use existing test tooling where practical; if a missing dependency is genuinely needed,
  explain it in the implementation and keep additions minimal.
- Run relevant client/admin lint and production builds, server syntax/tests, and lockfile
  integrity/install checks.
- Verify browser flows at mobile and desktop sizes; check keyboard access, form labels,
  error/status announcements, and reduced-motion behavior on changed screens.
- Test signed-out access, student access to protected/admin resources, and admin access
  boundaries without using or displaying the credentials previously shared in chat.
- Inspect API responses for private contact, reporter identity, payment proof, and admin
  review-note leakage.

### Release/handover

- Update `AGENTS.md`, `PROJECT_CONTRACT.md`, and `README.md` so architecture, supported flows,
  verified gaps, local commands, required environment variables, and operator steps agree.
- Document migration/backup/rollback guidance for the added exchange/report persistence and
  operational checks.
- Prepare a production checklist, deployment configuration appropriate to the existing
  marketplace/client, admin, and Express architecture, and concise release notes.
- Do not deploy to an external production account, modify production data, or invent
  secrets/SMTP/bank configuration. Mark live smoke tests, legal review, and deployment as
  owner-operated prerequisites where credentials or approvals are unavailable.

## Constraints

- Preserve the current separate `client/`, root `admin/`, and Express server architecture.
- Keep all authorization server-side and use parameterized SQL.
- Do not expose passwords, database/SMTP secrets, JWT signing secrets, proof bytes, contact
  details, or internal review notes to unauthorized users.
- Do not use, repeat, or include the password previously posted in chat.
- Do not introduce payments, chat, delivery, ratings, or unrelated features.
- Do not commit secrets or deploy without explicit production credentials and approval.

## Acceptance criteria

1. Root `AGENTS.md` accurately reflects the actual product contract and architecture; stale
   mock-only statements are removed or clearly qualified.
2. The malformed server lockfile is valid JSON and installs consistently with the manifest.
3. Contact reveal remains explicit, authenticated, consent-gated, private, and auditable.
4. Exchange creation, owner accept/decline, requester status, and confirmation survive page
   refresh and enforce authentication, ownership, listing availability, and valid transitions.
5. Report submission is authenticated and validated; reporter data is server-derived and
   never exposed publicly or to students.
6. Admin pages and API routes remain inaccessible to signed-out users and students, with
   Express enforcing current database role on every request.
7. Focused tests, both frontend builds/lints, backend syntax checks, and lockfile checks pass.
8. Documentation distinguishes verified local readiness from external production tasks
   that require operator credentials, legal review, or deployment access.
