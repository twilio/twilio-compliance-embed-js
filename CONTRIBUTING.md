# Contributing

## Prerequisites

- Node.js 18+
- npm 9+

## Setup

```bash
git clone <repo-url>
cd compliance-embeddable-sdk
npm install
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Compile to `dist/` (ESM + CJS + type declarations) |
| `npm test` | Run the full test suite |
| `npm run coverage` | Run tests with coverage report |
| `npm run typecheck` | Type-check without emitting output |

## Branching model

```
feature/*  →  next  →  main
```

| Branch | Purpose | Releases |
|--------|---------|----------|
| `main` | Stable, production-ready | Stable (`v1.2.3`) |
| `next` | Upcoming work | Pre-release (`v2.0.0-next.1`) |
| `feature/*` | Day-to-day development | None |

Always branch off `next`, never `main`:

```bash
git checkout next
git checkout -b feature/my-feature
```

Open PRs targeting `next`. When `next` is stable, it is merged into `main` to cut a stable release.

## Commit messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Versions are determined automatically — do not bump `package.json` manually.

| Prefix | Version bump |
|--------|-------------|
| `fix:` | Patch (`1.0.0` → `1.0.1`) |
| `feat:` | Minor (`1.0.0` → `1.1.0`) |
| `BREAKING CHANGE:` in footer | Major (`1.0.0` → `2.0.0`) |
| `chore:`, `docs:`, `refactor:`, etc. | No release |

## Pull requests

- PRs must target `next`.
- `build` and `test` Buildkite checks must pass before merging.
- Run `npm test` and `npm run typecheck` locally before opening a PR.

## Releases

Releases are automated via semantic-release on Buildkite — no manual steps required.

- Merging to `next` → pre-release GitHub release with build artifact.
- Merging to `main` → stable GitHub release with build artifact.
- Nothing is published to npm.

To preview a release locally:

```bash
npm run build
GITHUB_TOKEN=<your-token> npm run release -- --dry-run
```

## Adding a new IDV provider

1. Create `src/adapters/<ProviderName>Adapter.ts` implementing `IComplianceProvider`.
2. Map all vendor-specific fields to Twilio-defined types inside the adapter — no vendor vocabulary in public callbacks.
3. Declare the provider SDK as a `peerDependency`, not a direct dependency.
4. Load the provider SDK via dynamic `import()` inside `open()` to preserve SSR safety.
