# Admin login and admin-privilege repair

## Problem summary
The admin portal is currently failing to authenticate valid operators, even when the app is configured to accept a TUT account. The authentication flow must enforce a server-side `ADMIN` role, and the admin dashboard then needs to expose the expected management functionality: visitor statistics, report handling, payment-proof approval, listing review, and the related admin-only protections.

## Required behavior
After a user logs in as an admin, they should be able to:
- view aggregate statistics such as visitor counts and unique visitor totals
- review and manage reports
- review listings awaiting moderation and payment verification
- approve or reject payment proofs
- review seller listing compliance and remove/flag non-compliant private listings when required
- access the other admin capabilities already defined by the product contract, without exposing student-only data

The admin portal must enforce this server-side, not only in the UI.

## Root cause investigation
Check the following before implementation:
1. database connectivity for the Express API
2. whether the account exists in `users` with the `ADMIN` role
3. whether the admin NextAuth provider is rejecting non-admin logins correctly
4. whether the backend APIs and admin proxy routes are enforcing `ADMIN` access on every privileged endpoint
5. whether the admin UI routes fail silently because the session role or login is not being returned correctly

## Acceptance criteria
- A valid TUT-domain account with the `ADMIN` role can log in through the admin portal.
- Users without the `ADMIN` role cannot access admin routes or admin-only API data.
- `GET /api/admin/overview` and related admin APIs respond with the expected aggregate metrics.
- Reports can be reviewed and transitioned through the supported statuses.
- Payment proofs can be verified or rejected by authorized admins.
- If a listing is rejected or violates policy, the seller listing is kept private and the associated listing lifecycle is handled correctly.
- Student data remains protected; admin APIs never return private contact or password data.
- The admin session and cookie handling remain separate from the marketplace session flow.

## Files likely involved
- `server/server.js`
- `server/scripts/promote-admin.js`
- `admin/auth.ts`
- `admin/app/api/backend/[...path]/route.ts`
- `admin/app/page.tsx`
- `admin/components/AdminLoginForm.tsx`
- `admin/lib/auth-cookies.ts`
- `admin/app/**` admin pages and routes

## Implementation notes
- Use the existing server-side `ADMIN` role enforcement pattern already established in the codebase.
- Keep the fix scoped to auth, admin-role checks, and required admin flows.
- Do not broaden the product scope beyond admin auth and access control.
- Preserve the separate client/admin application structure.
- Validate the admin flow with a real DB-backed login and a real admin session before declaring success.

## Deliverables
- code fix for admin login and authorization
- any required one-off admin-user initialization fix or promotion flow if the DB is missing the admin record
- verification of the admin portal showing stats, reports, and payment review access
- exact test steps for the operator to run locally
