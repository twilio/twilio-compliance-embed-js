import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

// No vi.mock('persona') needed — persona is loaded via dynamic import inside
// PersonaAdapter.open(), so the dist artifacts can be loaded in Node.js without
// any mock in place. This file intentionally omits the mock to prove SSR safety.

describe('ESM consumer smoke test (dist/index.mjs)', () => {
  it('exports TwilioCompliance as a constructor function', async () => {
    const esm = await import('../../dist/index.mjs');
    expect(typeof esm.TwilioCompliance).toBe('function');
  });

  it('does not export TwilioResult (removed in favour of no-args onComplete)', async () => {
    const esm = await import('../../dist/index.mjs');
    expect((esm as Record<string, unknown>).TwilioResult).toBeUndefined();
  });

  it('exports TWILIO_ERROR_CODES with all expected numeric values', async () => {
    const esm = await import('../../dist/index.mjs');
    expect(esm.TWILIO_ERROR_CODES.UNAUTHENTICATED).toBe(21706);
    expect(esm.TWILIO_ERROR_CODES.INVALID_CONFIG).toBe(21711);
    expect(esm.TWILIO_ERROR_CODES.INTERNAL_PERSONA_ERROR).toBe(21710);
    expect(esm.TWILIO_ERROR_CODES.INACTIVE_TEMPLATE).toBe(21712);
    expect(esm.TWILIO_ERROR_CODES.UNKNOWN).toBe(21719);
  });

  it('TwilioCompliance.create() is callable from ESM import', async () => {
    const { TwilioCompliance } = await import('../../dist/index.mjs');
    expect(() =>
      TwilioCompliance.create({ sessionId: 's', sessionToken: 't' }),
    ).not.toThrow();
  });
});

describe('CJS consumer smoke test (dist/index.cjs)', () => {
  // .cjs extension is always treated as CommonJS by Node.js regardless of "type": "module"
  const require = createRequire(import.meta.url);

  it('exports TwilioCompliance as a constructor function', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cjs = require('../../dist/index.cjs');
    expect(typeof cjs.TwilioCompliance).toBe('function');
  });

  it('exports TWILIO_ERROR_CODES with all expected numeric values', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cjs = require('../../dist/index.cjs');
    expect(cjs.TWILIO_ERROR_CODES.UNAUTHENTICATED).toBe(21706);
    expect(cjs.TWILIO_ERROR_CODES.INVALID_CONFIG).toBe(21711);
    expect(cjs.TWILIO_ERROR_CODES.INTERNAL_PERSONA_ERROR).toBe(21710);
    expect(cjs.TWILIO_ERROR_CODES.INACTIVE_TEMPLATE).toBe(21712);
    expect(cjs.TWILIO_ERROR_CODES.UNKNOWN).toBe(21719);
  });

  it('TwilioCompliance.create() is callable from CJS require', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TwilioCompliance } = require('../../dist/index.cjs');
    expect(() =>
      TwilioCompliance.create({ sessionId: 's', sessionToken: 't' }),
    ).not.toThrow();
  });
});
