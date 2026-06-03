# Contributing

## Prerequisites

- Node.js 22+
- npm 10+

## Setup

```bash
git clone git@github.com:twilio/twilio-compliance-embed-js.git
cd twilio-compliance-embed-js
npm install
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Compile to `dist/` (ESM + CJS + IIFE + type declarations) |
| `npm test` | Run the full test suite |
| `npm run coverage` | Run tests with coverage report |
| `npm run typecheck` | Type-check without emitting output |

## Branching model

| Branch | Purpose |
|--------|---------|
| `main` | Stable, production-ready |
| `feature/*` | Day-to-day development |

Always branch off `main`:

```bash
git checkout main
git checkout -b feature/my-feature
```

Open PRs targeting `main`.

## Commit messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

| Prefix | Version bump |
|--------|-------------|
| `fix:` | Patch (`1.0.0` → `1.0.1`) |
| `feat:` | Minor (`1.0.0` → `1.1.0`) |
| `BREAKING CHANGE:` in footer | Major (`1.0.0` → `2.0.0`) |
| `chore:`, `docs:`, `refactor:`, etc. | No release |

## Pull requests

- PRs must target `main`.
- CI checks must pass before merging.
- Run `npm test` and `npm run typecheck` locally before opening a PR.

## Releases

Releases follow the GitHub Release flow with OIDC trusted publishing to npm:

1. Update the version in `package.json`
2. Merge to `main`
3. Create a GitHub Release with a semver tag (e.g. `v1.0.0`)
4. CI tests pass → environment approval → npm publish

## Adding a new IDV provider

1. Create `src/adapters/<ProviderName>Adapter.ts` implementing `IComplianceProvider`.
2. Map all vendor-specific fields to Twilio-defined types inside the adapter — no vendor vocabulary in public callbacks.
3. Declare the provider SDK as a `peerDependency`, not a direct dependency.
4. Load the provider SDK via dynamic `import()` inside the constructor to preserve SSR safety.
