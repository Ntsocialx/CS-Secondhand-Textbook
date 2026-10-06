# Admin Portal Setup, WhatsApp Contact Flow, and Auth Rate Limiting

## 1. Objective
Establish the isolated Next.js administrative application workspace under `admin/`, upgrade the student marketplace contact reveal mechanism to initiate pre-filled WhatsApp conversations, and implement server-side rate limiting on authentication routes to block brute-force password attempts.

## 2. Verified Current State
- `client/` contains a Next.js 16 application for public listing discovery, user authentication, and book management.
- `server/` contains an Express 5 API managing PostgreSQL database operations, JWT authentication, and public marketplace endpoints.
- `admin/` already exists as an independent Next.js app with server-side proxy routes at `admin/app/api/backend/`; extend it rather than scaffolding another app.
- The repository already contains a root `AGENTS.md` specifying product boundaries, security, and workflow requirements. Treat that file as the authoritative project contract.

## 3. Scope
### In-Scope
- Initializing `admin/` using Next.js 16, TypeScript, Tailwind CSS, and NextAuth.
- Exposing a payment-proofs route in the admin app (the existing review queue is `/listings`) and retaining the existing reports view (`/reports`).
- Preserving the existing server-side admin role authorization in Express, which checks the current database role (`ADMIN`) on each protected request.
- Updating `client/` listing details so clicking "Contact Seller" prompts login if unauthenticated, logs consent, and opens WhatsApp using the link structure: `https://wa.me/<phone>?text=Hi%20<Seller_Name>,%20I%20am%20interested%20in%20getting%20your%20listed%20book%20<Book_Title>`.
- Integrating `express-rate-limit` middleware on `/api/auth/login` and `/api/auth/register` endpoints.
- Creating a test-student seed script that requires the student email and password from the server environment and does not overwrite an existing account. Admin accounts must be registered normally and promoted only through the existing server-host CLI command; never seed shared/default admin credentials.

### Out-of-Scope
- In-app chat, payment processing integrations, or delivery logistics.
- Redesigning existing frontend marketplace screens.

## 4. Acceptance Criteria
- Browsing public listings remains open to unauthenticated visitors.
- Clicking "Contact Seller" requires an active student session.
- After login, the buyer explicitly consents to the contact reveal; the server audits the reveal and the action opens WhatsApp with the expected message.
- Admin users accessing `admin/` can log in, view pending R5 payment proofs, approve or reject listings, and review reports.
- Non-admin accounts attempting to hit admin endpoints receive HTTP 403 Forbidden.
- More than 5 failed login attempts from a single IP within a 15-minute window returns an HTTP 429 Too Many Requests response.
- TUT email domains (`student.tut.ac.za`, `tut.ac.za`, `tut4life.ac.za`) remain strictly enforced across client and server logic.

## 5. Accessibility, Privacy, and Security
- Seller phone numbers remain completely hidden until explicit buyer consent is given during the reveal action.
- Passwords are strictly hashed; no credentials appear in source code or log files.
- Admin privileges are checked on the server for every protected route.
- All controls retain clear focus indicators and accessible labels.
- Do not expose private contact info, payment proof bytes, or admin review notes in public listing responses.
- Use parameterized SQL, validate inputs at the API boundary, and keep auth/authorization checks server-side.

## 6. Validation
- Run `npm run lint` and `npm run build` in `client/` and `admin/`.
- Run `npm test` in `server/`.
- Send 6 consecutive rapid invalid login requests to `POST /api/auth/login` to confirm the HTTP 429 rate limit response.
- Manually test student and admin flows only with locally provisioned credentials; do not assume known passwords for named accounts.
- Verify signed-out access to protected routes and student access to admin-only routes is refused.

## 7. Assumptions
- Seller phone numbers in the database are stored or normalized into E.164 international format (e.g., `27821234567`) to ensure valid WhatsApp link formatting.
- A real admin session is required for `admin/` pages and server-side API routes; do not rely solely on client-side checks.
- Existing infrastructure may already have a partial admin app or backend routes; reuse those patterns and keep the work minimal and consistent with the current repo.

## 8. Implementation Requirements
- Keep the student marketplace and independent admin app separated.
- Do not hard-code demo passwords, directly seed an ADMIN role, or reset existing account credentials. Create an admin by registering it and using `npm run admin:promote -- <registered-tut-email>` from the server terminal.
- Keep Next.js frontend and Express API separate; do not connect browser code directly to PostgreSQL.
- Preserve all existing non-targeted functionality and avoid unrelated refactors.
- Add only the smallest dependency needed to provide rate limiting if the project does not already include it.
- Match the established product visual style and do not overbuild beyond the requested flow.
- Maintain accessible forms, loading states, empty states, and handled errors for any API-backed views.

## 9. Run Checklist for the Engineer
1. Read `AGENTS.md` and the relevant implementation files before starting.
2. Inspect the current auth, listing, and admin endpoints to confirm actual route contracts.
3. Implement the isolated `admin/` setup, admin pages, and protected route enforcement.
4. Add the WhatsApp contact flow and ensure consent logging is server-backed and private.
5. Add rate limiting to auth APIs using server-side middleware and verify the lockout behavior.
6. Run focused lint/build/test validation.
7. Report exact verification results and manual test steps. Do not deploy or modify production data.
