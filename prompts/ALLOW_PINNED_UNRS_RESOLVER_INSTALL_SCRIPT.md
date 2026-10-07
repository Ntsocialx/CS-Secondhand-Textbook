# Allow the Pinned unrs-resolver Install Script

## Problem

Vercel's npm install reports that `unrs-resolver@1.12.2` has an unreviewed `postinstall` script. The warning is from npm 12's `allowScripts` policy; the repository's local npm is 11.17 and does not support the `npm install-scripts` subcommand.

The package is a transitive development dependency of `eslint-config-next` through `eslint-import-resolver-typescript`. Its lockfile integrity is recorded in both `client/package-lock.json` and `admin/package-lock.json`. The declared script calls `napi-postinstall` to locate or prepare the platform-specific resolver binding.

## Goal

Remove the Vercel install warning safely by explicitly approving only the reviewed, locked package version in the app or apps whose Vercel install emits the warning.

## Requirements

1. Keep the change limited to `allowScripts` metadata in the relevant app `package.json` file or files. Do not allow all dependency scripts and do not disable npm's script policy.
2. Pin the approval to `unrs-resolver@1.12.2`; do not create a broad name-only approval.
3. Since both `client/` and `admin/` have this same locked transitive dependency and are separate Vercel apps, apply the entry to both only if both deployments use npm 12 and should permit this script. Otherwise, update only the confirmed deployment root.
4. Use npm 12's `npm install-scripts approve unrs-resolver` from the relevant app directory when possible. If local npm 11 is in use, use a temporary npm 12 CLI (without changing the globally installed npm) or make the equivalent minimal, validated manifest edit.
5. Do not change dependency versions or regenerate package locks unless npm requires it. Do not commit unrelated lockfile churn.
6. Validate JSON, confirm npm 12 lists no unreviewed `unrs-resolver` script for the affected app, and run its available lint/build checks. Explain that Vercel must redeploy before the new policy takes effect.

## Acceptance

- Only `unrs-resolver@1.12.2` is explicitly allowed where needed.
- The approval is recorded in the app manifest and is reproducible in Vercel installs.
- The relevant app build passes and the exact redeploy verification steps are provided.