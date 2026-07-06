# Releasing

This package (`@twilio/twilio-compliance-embed-js`) is published to the public
npm registry using **npm OIDC trusted publishing** — there are no long-lived npm
tokens stored in the repo or in CI. Publishing follows Twilio's
**build-public, gate-internal, publish-public** pattern (ADR 1634).

- **CI** (`.github/workflows/ci.yml`) resolves dependencies through the curated
  Twilio Artifactory registry via OIDC, and runs lint / typecheck / build / test.
- **Publish** (`.github/workflows/publish.yml`) runs on a published GitHub
  Release, re-runs the test matrix, then publishes to public npm with
  `--provenance` from the `production` GitHub Environment (a manual-approval gate).

> **Names must stay in sync.** The trusted-publisher binding on npmjs.com is
> matched against the exact **workflow filename** (`publish.yml`) and
> **environment name** (`production`). If you rename either, you must update the
> trusted publisher on npmjs.com or every OIDC publish will fail.

## One-time setup (do this once, before the first release)

These steps require repo-admin and npm-org-admin access. The setup script
automates both the trusted-publisher registration and the GitHub environment —
it registers the trusted publisher against `--file publish.yml --env production`
and creates the `production` environment with a team reviewer gate. Run it, then
do the manual first publish below.

> The `ARTIFACTORY_URL` repo variable (`https://twilio.jfrog.io`) is already set
> under **Settings → Secrets and variables → Actions → Variables**. The repo is
> already trusted in Artifactory OIDC (CI proves this), so no Secure Supply Chain
> ticket is needed.

### The `production` GitHub Environment

`publish.yml`'s `deploy` job targets `environment: production`. The setup script
creates it with a `wait_timer`, `prevent_self_review`, and a team as required
reviewers. If you configure it by hand instead:

1. **Settings → Environments → New environment** → name it `production`.
2. Add **Required reviewers** (the people/team allowed to approve a publish).

Without this environment the publish workflow cannot run the deploy job.

### First publish is manual, then register the trusted publisher

npm does **not** support "pending" trusted publishers, so the very first publish
must be done by hand with a one-time token. Every publish after that is keyless
via OIDC.

1. Make sure `package.json` `version` is the version you intend to ship, and the
   build is green.
2. Generate a **granular access token** on npmjs.com with publish permission for
   `@twilio/twilio-compliance-embed-js` (scoped as narrowly as possible).
3. Publish once locally:
   ```bash
   npm run build
   npm publish --access public
   ```
4. Register the trusted publisher (the setup script does this via
   `npm trust github`, or do it on npmjs.com → package → **Settings → Trusted
   Publishers → Add**):
   - **Organization / owner:** `twilio`
   - **Repository:** `twilio-compliance-embed-js`
   - **Workflow filename:** `publish.yml`
   - **Environment name:** `production`
5. **Delete the one-time token.** All future releases publish keylessly via the
   workflow.

## Cutting a release (every time)

1. **Bump the version** in `package.json` following [SemVer](https://semver.org),
   and update `CHANGELOG.md`. Merge to `main`.
2. **Create a GitHub Release** with a tag of the form `vX.Y.Z`. The tag **must
   exactly match** `package.json`'s `version` (e.g. tag `v1.2.3` ↔ version
   `1.2.3`) — the publish workflow fails the build otherwise.
3. The **Publish** workflow then:
   - runs the test matrix (Node 22 + 24),
   - waits for approval on the `production` environment,
   - publishes to public npm with provenance.
4. **Verify** the publish:
   ```bash
   npm view @twilio/twilio-compliance-embed-js@X.Y.Z
   ```
   and confirm the provenance badge shows on the npmjs.com package page.

## Notes

- **Node 24+** is required for the publish job (npm ≥ 11.5.1 added OIDC trusted
  publishing). The matrix still tests Node 22, but only `deploy` needs 24.
- **`package-lock.json` must resolve to `registry.npmjs.org`**, never to an
  internal Artifactory host. A hardcoded internal host breaks `npm ci` on CI
  runners (and for external consumers). If you regenerate the lockfile on a
  Twilio laptop whose npm points at Artifactory, rewrite the `resolved` hosts
  back to `https://registry.npmjs.org` before committing.
- `npm publish` uses `--ignore-scripts` to block install-time lifecycle scripts,
  and `--access public` for this scoped package.
