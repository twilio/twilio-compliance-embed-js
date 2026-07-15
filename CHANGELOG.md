# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.3] - 2026-07-15

### Added

- `onSubmit({ outcome })` callback that fires when the user reaches a terminal
  screen of the compliance flow. The SDK detects terminal screens via the
  reserved `twilio:compliance:terminal:<outcome>` naming convention on Persona
  page-change events. Independent of `onComplete` (button-gated).
- Exported `SubmitResult` type for the `onSubmit` payload.

### Removed

- IIFE bundle (`dist/iife/`) is no longer included in the npm package. The
  CDN-hosted script tag bundle remains available separately.

## [0.0.2] - 2026-07-06

### Changed

- First release published through the automated GitHub Actions pipeline using
  npm OIDC trusted publishing. No functional changes to the SDK since `0.0.1`.

## [0.0.1] - 2026-07-06

### Added

- Initial release of `@twilio/twilio-compliance-embed-js`.
