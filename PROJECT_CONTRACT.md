# Campus Text Exchange — Project Contract

**Version:** 1.0  
**Date:** 17 September 2026  
**Repository:** `Ntsocialx/CS-Secondhand-Textbook`  
**Project type:** Student-to-student secondhand textbook marketplace  
**Delivery model:** Phased implementation with two-week sprints

## 1. Contract purpose

This document is the working contract for the Campus Text Exchange project. It defines:

- The problem being solved
- The intended users and product outcome
- The MVP scope and explicit exclusions
- The technical and security rules
- The phase and sprint roadmap
- The definition of done for each phase
- The current implementation baseline and known gaps

Future changes should be evaluated against this document. A feature is not considered complete because its page exists; it is complete when its user flow, API behavior, persistence, security, error handling, and acceptance criteria are verified.

## 2. Problem statement

University textbooks are expensive and are often used for only one semester. Students need a trusted, affordable way to buy, sell, or exchange used textbooks directly with other students on their campus.

The product must make it easy for a student to:

1. Discover a textbook by title, course code, subject, university, or campus.
2. Understand the condition, price, and seller context.
3. Contact a seller only through an intentional, privacy-aware action.
4. List a textbook with enough information for another student to make a decision.
5. Arrange a safe in-person campus meetup for a sale or exchange.
6. Report suspicious listings, unsafe conduct, or policy violations.

The product is a campus marketplace, not a payment, delivery, chat, or logistics platform.

## 3. Product principles

1. **Student-first affordability:** Reduce the cost of course materials.
2. **Verified campus participation:** Require approved student email domains.
3. **Privacy by default:** Do not expose private contact details in public listing responses.
4. **Safe meetups:** Encourage public, on-campus, daytime exchanges.
5. **Simple MVP:** Use direct flows instead of complex checkout or messaging systems.
6. **Clear consent:** Require POPIA consent before account creation or login.
7. **Reliable access control:** Marketplace actions require authentication.
8. **Figma-aligned UX:** Keep the visual language consistent with the supplied Campus Text Exchange mockups.

## 4. Users and roles

### Student

Can:

- Register with an approved student email
- Sign in and sign out
- Browse and filter textbook listings
- View listing details
- Request seller contact details
- Create and manage personal listings
- Mark a listing as sold
- Request an exchange
- Report a listing or user

### Administrator

Can:

- Access protected analytics
- Review visitor metrics
- Eventually review reports and moderate listings

Admin capabilities must never be granted by a client-side role check alone. The Express API must enforce authorization.

## 5. MVP scope

### In scope

- Student registration and login
- Approved student email validation
- TUT support, including `student.tut.ac.za` and `tut.ac.za`
- POPIA consent capture and versioning
- Essential/optional cookie choice
- Failed-login lockout
- Protected marketplace routes
- Listing creation
- Listing image upload
- Listing browsing and filtering
- Listing detail page
- Seller contact reveal
- Mark listing as sold
- Exchange request and confirmation
- Report listing/user flow
- Campus meetup safety guidance
- Admin visitor analytics
- Responsive Figma-style UI

### Explicitly out of scope

Do not add these without a separately approved scope change:

- Online payments or payment gateways
- Delivery, shipping, or tracking
- Real-time chat or WebSockets
- Price negotiation workflows
- Ratings, reviews, or seller feedback scores
- Complex checkout flows
- Social feeds or follower systems
- Unnecessary state-management libraries or UI kits

## 6. Current technical baseline

### Frontend

- Next.js 16.3.5
- React 19
- TypeScript
- Tailwind CSS 4
- NextAuth credentials provider
- App Router pages under [`client/app/`](C:/Users/student/Desktop/CS-Secondhand-Textbook/client/app/)

### Backend

- Express 5
- PostgreSQL through `pg`
- Neon-compatible database
- `bcryptjs` password hashing
- JWT access tokens
- CORS and JSON middleware

### Current database tables

- `users`
- `visitor_events`
- `login_attempts`
- `listings`

### Current data state

The Figma preview catalog remains static in [`client/lib/marketplace.ts`](C:/Users/student/Desktop/CS-Secondhand-Textbook/client/lib/marketplace.ts), while authenticated listing workflows use PostgreSQL records. The book images are local assets under [`client/public/books/`](C:/Users/student/Desktop/CS-Secondhand-Textbook/client/public/books/).

## 7. Current implementation status

### Implemented baseline

- Figma-style shared header, footer, cards, forms, and book covers
- Home page
- Browse page
- Book details page
- Seller contact mockup page
- Sell/listing form mockup
- My Listings mockup
- Exchange request mockup
- Exchange confirmation mockup
- Report page mockup
- Login page
- Registration page
- POPIA consent modal
- Cookie consent banner
- TUT selector and approved TUT domains
- Protected marketplace routes through [`client/proxy.ts`](C:/Users/student/Desktop/CS-Secondhand-Textbook/client/proxy.ts)
- Five-failure, five-minute PostgreSQL-backed login lockout
- API-backed listing creation, browse/search/filter, details, and My Listings
- Ownership-protected mark-as-sold workflow
- Admin analytics route and salted visitor IP hashes
- Local Figma-derived book images

### Known gaps before MVP completion

- Image upload currently stores validated base64 data URLs in PostgreSQL; object storage is still required before production scale.
- Browse currently supports course, campus, and condition filters; subject, price range, and sorting remain future enhancements.
- Listing edit UI is not yet exposed, although the ownership-protected PATCH endpoint exists.
- Seller contact reveal is not backed by a protected endpoint.
- Exchange requests are not stored.
- Reports are local UI state and are not sent to the API.
- There is no moderation queue.
- Reports, exchanges, seller contact reveal, moderation, and consent audit history remain future API work.
- The schema is startup-created with `CREATE TABLE IF NOT EXISTS`; a versioned migration runner is recommended before production.

## 8. Architecture contract

1. Keep the frontend and Express API separate.
2. Frontend components must call the Express API through shared helpers such as [`client/lib/api.ts`](C:/Users/student/Desktop/CS-Secondhand-Textbook/client/lib/api.ts).
3. Do not connect Next.js components directly to PostgreSQL.
4. Keep the data model intentionally small. Prefer a minimal set of tables over a complex domain model.
5. Use parameterized SQL for every database query.
6. Validate and normalize user input at the API boundary.
7. Keep secrets in environment variables and never commit them.
8. Enforce authentication and authorization on the server, not only in the UI.
9. Use explicit error responses; do not silently swallow API failures.
10. Keep UI behavior responsive and provide loading, empty, success, and error states.

## 9. Security and privacy contract

### Authentication

- Passwords must be hashed with `bcryptjs`.
- Sessions must use secure, signed tokens.
- Protected pages must redirect unauthenticated users to login.
- Protected API endpoints must validate the bearer token.
- Admin endpoints must validate the `ADMIN` role server-side.

### Login abuse prevention

Current target:

- Five failed password attempts
- Five-minute lockout
- Keyed by normalized email and client IP
- Successful login clears the failure counter
- Locked requests return HTTP `429` with `Retry-After`

Before production deployment, move lockout state to a shared durable store or database-backed rate-limit mechanism so multiple server instances cannot bypass the control.

### Consent and cookies

- POPIA consent is required before registration and login.
- Consent version and timestamp must be recorded.
- Contact-display consent must be separate and optional.
- Essential cookie choice must not be bypassed by the client UI.
- Cookie preferences must be documented and use an appropriate `SameSite` policy.
- Do not store sensitive personal information in analytics events.

### Contact privacy

- Public listing responses must not include raw seller phone numbers or private email addresses.
- Contact details may be returned only after an authenticated, explicit reveal request.
- The reveal action must be auditable.
- Displayed contact data should be masked where appropriate.

### Reporting safety

- Reports must be submitted to the API.
- Reports must include category, description, reporter identity when authenticated, target listing/user, and timestamp.
- Report submission must not expose the reporter publicly.
- Admins need a review path before reports are considered resolved.

## 10. Delivery phases and sprints

Each sprint is expected to produce a demonstrable increment. Sprint length is two weeks unless the project owner approves a change.

## Phase 0 — Product contract and technical foundation

### Sprint 0.1 — Baseline and acceptance contract

**Goals**

- Confirm the problem, users, MVP scope, and exclusions.
- Establish the Figma screens as the visual reference.
- Record current implementation status and known gaps.

**Deliverables**

- This contract
- Route and feature inventory
- Environment-variable checklist
- Definition-of-done checklist

**Acceptance criteria**

- Every current route is listed.
- Every in-scope MVP capability has an owner sprint.
- Out-of-scope features are explicitly recorded.

### Sprint 0.2 — API and data model plan

**Goals**

- Define API contracts before wiring UI to persistence.
- Keep the data model minimal and extensible.

**Deliverables**

- Listings data model
- Reports data model
- Exchange request data model
- Consent/audit decisions
- Endpoint request/response examples

**Acceptance criteria**

- Every form has a corresponding API endpoint or is intentionally deferred.
- Public/private fields are identified.
- Authorization requirements are documented for every protected endpoint.

## Phase 1 — Identity, consent, and access control

### Sprint 1.1 — Registration and login

**Goals**

- Deliver production-quality student registration and sign-in.

**Deliverables**

- Student email validation
- TUT and other approved university support
- Password hashing
- Session creation
- Helpful validation errors

**Acceptance criteria**

- Invalid domains cannot register or log in.
- Passwords are never stored in plaintext.
- A valid student can register and sign in.
- Duplicate accounts return a safe, user-friendly error.

### Sprint 1.2 — Consent, cookies, and abuse controls

**Goals**

- Protect user data and authentication from predictable abuse.

**Deliverables**

- POPIA consent persistence
- Cookie preference persistence
- Protected marketplace routes
- Five-attempt/five-minute login lockout
- Shared-store design for production lockout state

**Acceptance criteria**

- Login and registration cannot proceed without required consent.
- Unauthenticated users are redirected from protected routes.
- Five failed attempts cause a 429 response and visible lockout message.
- Successful authentication resets the failure count.

## Phase 2 — Listings and discovery

### Sprint 2.1 — Listing persistence and creation

**Goals**

- Turn the sell screen into a working listing workflow.

**Deliverables**

- Listings table
- Authenticated create-listing endpoint
- Title, course code, price, condition, description, university/campus
- Server-side validation
- Listing ownership

**Acceptance criteria**

- Authenticated students can create a valid listing.
- Invalid price, condition, or missing required fields are rejected.
- A created listing can be retrieved after refresh.
- A student cannot create a listing on behalf of another user.

### Sprint 2.2 — Images and browsing

**Goals**

- Connect browse and details screens to real records and images.

**Deliverables**

- Image upload/storage strategy
- Public listing search endpoint
- Course, subject, campus, condition, and price filters
- Sort order
- Loading, empty, and error states

**Acceptance criteria**

- Browse results come from the API.
- Filters change the returned results.
- Listing images validate file type and size.
- Missing images use an intentional fallback.

### Sprint 2.3 — Listing lifecycle and ownership

**Goals**

- Complete the seller’s listing management flow.

**Deliverables**

- My Listings endpoint
- Edit listing
- Mark as sold
- Draft/active/sold states if retained in scope
- Delete/archive behavior

**Acceptance criteria**

- A student sees only their own listings in My Listings.
- Marking sold changes availability everywhere.
- Sold listings cannot receive new active purchase/exchange requests.
- Unauthorized ownership changes are rejected.

## Phase 3 — Safe student exchange

### Sprint 3.1 — Protected seller contact

**Goals**

- Implement intentional, privacy-aware contact reveal.

**Deliverables**

- Protected contact endpoint
- Consent-aware response
- Masked display behavior
- Reveal audit event

**Acceptance criteria**

- Raw contact data never appears in public listing results.
- Only authenticated users can request contact details.
- Seller contact-display consent is respected.
- A denied/hidden contact state is clear in the UI.

### Sprint 3.2 — Exchange requests

**Goals**

- Convert the exchange mockups into a persisted request flow.

**Deliverables**

- Exchange request endpoint
- Requested and offered listing references
- Condition preference
- Optional seller note
- Confirmation response
- Request status

**Acceptance criteria**

- A student can submit an exchange request for an available listing.
- The request is persisted and visible after refresh.
- Duplicate or invalid requests are rejected.
- The seller is not exposed to real-time chat or negotiation features.

### Sprint 3.3 — Meetup safety and reports

**Goals**

- Make safety and reporting functional.

**Deliverables**

- Report persistence endpoint
- Listing/user report categories
- Authenticated report submission
- Admin report review foundation
- Safety guidance on contact and exchange screens

**Acceptance criteria**

- A user can submit a report with a category and details.
- The report is not publicly visible.
- Duplicate spam behavior is controlled.
- Admins can retrieve unresolved reports.

## Phase 4 — Administration, quality, and release

### Sprint 4.1 — Admin operations and analytics

**Goals**

- Provide safe oversight of the marketplace.

**Deliverables**

- Visitor analytics
- Report queue
- Listing moderation actions
- Audit visibility for contact reveals and status changes

**Acceptance criteria**

- Non-admin users cannot access admin APIs or pages.
- Analytics do not expose raw IP addresses.
- Admin errors are visible and actionable.

### Sprint 4.2 — Quality, accessibility, and hardening

**Goals**

- Prepare the MVP for real student use.

**Deliverables**

- Targeted frontend and API tests
- Keyboard and screen-reader checks
- Responsive checks at mobile, tablet, and desktop sizes
- Error and empty-state review
- Security review
- Production environment checklist

**Acceptance criteria**

- Lint and build pass.
- Core auth, listing, contact, sold, exchange, and report flows are tested.
- No known high-severity authorization issue remains.
- Sensitive environment values are absent from source control.

### Sprint 4.3 — Release and handover

**Goals**

- Deploy and document the working MVP.

**Deliverables**

- Deployment configuration
- Database migration/runbook
- Operator/admin guide
- User-facing safety and privacy information
- Release notes

**Acceptance criteria**

- Production smoke test passes.
- Rollback procedure is documented.
- Admin access is verified.
- The project owner accepts the release against this contract.

## 11. Global definition of done

A feature is done only when all applicable items are true:

- The UI matches the established Figma visual system.
- The feature works on mobile and desktop.
- The API and database behavior are implemented where the feature is in scope.
- Authentication and authorization are enforced server-side.
- Inputs are validated and normalized.
- Sensitive data is not exposed in public responses.
- Loading, empty, success, and failure states are present.
- Existing flows do not regress.
- Relevant lint, type checks, builds, and tests pass.
- Documentation is updated when behavior or setup changes.

## 12. Quality gates

Before merging a sprint:

1. Run the client linter.
2. Run the client production build.
3. Run server syntax checks and available tests.
4. Test the changed flow in a browser.
5. Check protected routes while signed out.
6. Check the same route while signed in as a student.
7. Check admin-only behavior with a non-admin account.
8. Review network responses for accidental private data exposure.
9. Confirm no secrets, database URLs, or tokens are committed.

## 13. Change-control rules

Any proposed change that affects scope, data privacy, authentication, or the database must record:

- Why the change is needed
- Which sprint is affected
- What behavior changes
- Security/privacy impact
- Migration or rollback impact
- Updated acceptance criteria

No new dependency, payment flow, messaging system, delivery feature, or ratings system may be introduced without explicit scope approval.

## 14. Success measures

The MVP is successful when:

- Students can find relevant books quickly.
- Listings are cheaper and more accessible than new textbooks.
- Students can complete a safe, direct campus exchange arrangement.
- Contact details remain private until intentionally revealed.
- Reports can be submitted and reviewed.
- Authentication resists basic credential abuse.
- The system remains simple enough for a student team to operate and extend.
