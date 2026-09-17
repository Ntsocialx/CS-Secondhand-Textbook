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
visitor analytics, responsive Figma-aligned UI.

Out of scope (needs a separately approved scope change): online payments, delivery/shipping/
tracking, real-time chat or WebSockets, price negotiation workflows, ratings/reviews/seller
feedback scores, complex checkout flows, social feeds/follower systems, unnecessary
state-management libraries or UI kits.

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

Current tables: `users`, `visitor_events`. Missing and required before the gaps above close:
listings, reports, exchanges, and consent audit history tables.

Required before saving:
- Listing: title, course code, price, condition, description, university/campus, owner
  (student who is authenticated) — a student can never create a listing on behalf of another
  user.
- Report: category, description, reporter identity (when authenticated), target listing/user,
  timestamp — reporter must never be exposed publicly.
- Consent: version + timestamp recorded at registration/login; contact-display consent is
  separate and optional.

## 6. API contracts

No committed route table exists yet beyond auth — pin exact paths + HTTP methods here as each
sprint's endpoints (listings, contact reveal, exchange requests, reports) are implemented, and
keep this section in sync with the code.

## 7. Security

Never expose to the browser: raw seller phone numbers or private email addresses in public
listing responses, database credentials, JWT signing secret, admin role checks.

Never run from the browser: password hashing, login-lockout enforcement, contact-reveal
authorization, report-target visibility rules.

Specific rules:
- Five failed password attempts → five-minute lockout, keyed by normalized email + client IP;
  successful login clears the counter; locked requests return HTTP 429 with `Retry-After`.
  Before production, move this off in-memory state to a shared durable store.
- Contact details are returned only after an authenticated, explicit reveal request, and the
  reveal action must be auditable.
- Admin endpoints must validate the `ADMIN` role server-side — never trust a client-side role
  check.

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
