import { describe, it, expect } from 'vitest';

// No vi.mock('persona') needed — persona is loaded via dynamic import inside
// PersonaAdapter.open(), so it is never evaluated at module load time.
// Importing the SDK here in Node.js must not crash without any mock in place.
import { TwilioCompliance, TWILIO_ERROR_CODES } from '../../src/index';

describe('SSR import smoke test (Node.js — no DOM)', () => {
  it('runs in a Node.js environment with no window object', () => {
    expect(typeof window).toBe('undefined');
  });

  it('TwilioCompliance is importable and is a constructor function', () => {
    expect(typeof TwilioCompliance).toBe('function');
  });

  it('TWILIO_ERROR_CODES numeric values are accessible', () => {
    expect(TWILIO_ERROR_CODES.UNAUTHENTICATED).toBe(21706);
    expect(TWILIO_ERROR_CODES.INVALID_CONFIG).toBe(21711);
    expect(TWILIO_ERROR_CODES.INTERNAL_PERSONA_ERROR).toBe(21710);
    expect(TWILIO_ERROR_CODES.INACTIVE_TEMPLATE).toBe(21712);
    expect(TWILIO_ERROR_CODES.UNKNOWN).toBe(21719);
  });

  it('create() works in Node.js without throwing', () => {
    expect(() => {
      TwilioCompliance.create({ sessionId: 's', sessionToken: 't' });
    }).not.toThrow();
  });

  it('open() is a silent no-op in Node.js (SSR guard fires, no DOM access)', () => {
    const sdk = TwilioCompliance.create({ sessionId: 's', sessionToken: 't' });
    expect(() => sdk.open()).not.toThrow();
  });

  it('destroy() is a safe no-op in Node.js', () => {
    const sdk = TwilioCompliance.create({ sessionId: 's', sessionToken: 't' });
    expect(() => {
      sdk.open();
      sdk.destroy();
    }).not.toThrow();
  });

  it('preload() resolves immediately in Node.js without loading Persona', async () => {
    await expect(TwilioCompliance.preload()).resolves.toBeUndefined();
  });
});
