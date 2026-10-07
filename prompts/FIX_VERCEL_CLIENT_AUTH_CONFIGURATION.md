# Fix Client Authentication on Vercel

## Problem

The deployed student client shows NextAuth's generic `Server error` page at `/api/auth/error` during interactions. The local `client/.env` contains a placeholder value for `NEXTAUTH_SECRET`. The client auth handler in `client/auth.ts` consumes `NEXTAUTH_SECRET` and uses `NEXTAUTH_URL` to construct its credential-login URL. The production Vercel environment has not been inspected, so do not assume the deployed values match the local file.

## Goal

Restore authentication-dependent client interactions on Vercel without exposing or committing secrets. Determine whether the immediate cause is production environment configuration, a code-level URL/configuration defect, or both, then fix the smallest confirmed cause.

## Requirements

1. Inspect the current `client/auth.ts`, auth route and login proxy, client environment examples, and package scripts before editing.
2. Confirm the deployed client needs a non-placeholder `NEXTAUTH_SECRET` and a canonical `NEXTAUTH_URL` matching its Vercel domain. Do not print secret values, add them to a file, or commit them. If Vercel settings cannot be accessed from this workspace, state that limitation and provide exact dashboard steps; do not claim the deployment is fixed until it is redeployed and checked.
3. Check how the credential provider builds its login URL. Prevent production from silently calling `localhost` when `NEXTAUTH_URL` is absent, using the smallest compatible fix supported by this Next.js/NextAuth version. Preserve local development behavior.
4. Keep the Express API separate and preserve existing auth/session behavior. Do not make unrelated marketplace changes.
5. Add or update documentation only if needed to explain the Vercel client environment variables and redeployment requirement. Do not put sample secrets that could be mistaken for real credentials.
6. Run the client lint/build checks available in `client/package.json`. Verify the deployed `/api/auth/session` responds as an auth endpoint rather than `404: NOT_FOUND`, and verify sign-in/logout flows after Vercel environment values are set.

## Vercel configuration to verify

- `NEXTAUTH_SECRET`: a newly generated, high-entropy value set in Vercel project settings for the student client; the same value must be present for each deployment environment that should support authentication.
- `NEXTAUTH_URL`: the canonical HTTPS URL for the student client deployment, not the separate admin deployment.
- API base URL variables: verify against the existing client API helper and configured Express deployment; do not change them without evidence that they contribute to this failure.

After setting or changing Vercel environment variables, redeploy so the production serverless functions receive them. Never ask the user to paste secret values into chat.

## Acceptance

- The NextAuth handler no longer reports a server-configuration error when production variables are valid.
- Credential login targets the student client auth proxy on the deployed host, not `localhost` or the admin host.
- Missing or placeholder deployment configuration is clearly identified without disclosing secret values.
- Client lint/build passes, and exact manual Vercel verification steps are provided.