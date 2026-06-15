/**
 * Global Vitest setup — runs before any test file.
 *
 * Polyfills `self` for Node.js environments so that browser-only peer dependencies
 * (e.g., the Persona SDK) can be loaded without crashing on `self is not defined`.
 *
 * This only affects the test runner; production bundle consumers are responsible
 * for their own browser environment.
 */
if (typeof globalThis.self === 'undefined') {
  (globalThis as Record<string, unknown>).self = globalThis;
}
