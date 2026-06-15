// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { runInThisContext } from 'node:vm';
import { resolve } from 'node:path';

const iifeDir = resolve(__dirname, '../../dist/iife');

function findBundle(): string {
  let files: string[];
  try {
    files = readdirSync(iifeDir);
  } catch {
    throw new Error(`dist/iife/ directory not found — run 'npm run build' first`);
  }
  // Match twilio-compliance-v<version>.js but NOT .min.js or .map
  const bundle = files.find(
    (f) => /^twilio-compliance-v[\d.]+(-[\w.]+)?\.js$/.test(f),
  );
  if (!bundle) {
    throw new Error(`No IIFE bundle found in dist/iife/ — run 'npm run build' first`);
  }
  return resolve(iifeDir, bundle);
}

beforeAll(() => {
  const bundlePath = findBundle();
  runInThisContext(readFileSync(bundlePath, 'utf-8'));
});

describe('IIFE bundle — browser globals', () => {
  it('registers window.TwilioCompliance as a function', () => {
    expect(typeof (window as Record<string, unknown>)['TwilioCompliance']).toBe('function');
  });

  it('registers window.TWILIO_ERROR_CODES with all expected numeric values', () => {
    const codes = (window as Record<string, unknown>)['TWILIO_ERROR_CODES'] as Record<string, number>;
    expect(codes['INVALID_CONFIG']).toBe(21711);
    expect(codes['UNAUTHENTICATED']).toBe(21706);
    expect(codes['INTERNAL_PERSONA_ERROR']).toBe(21710);
    expect(codes['INACTIVE_TEMPLATE']).toBe(21712);
    expect(codes['UNKNOWN']).toBe(21719);
  });

  it('TwilioCompliance.create() returns an instance with open and destroy', () => {
    const TC = (window as Record<string, unknown>)['TwilioCompliance'] as {
      create: (config: Record<string, unknown>) => Record<string, unknown>;
    };
    const instance = TC.create({ sessionId: 'test-session', sessionToken: 'test-token' });
    expect(typeof instance['open']).toBe('function');
    expect(typeof instance['destroy']).toBe('function');
  });

  it('is idempotent — double-loading does not overwrite existing globals', () => {
    const bundlePath = findBundle();
    const before = (window as Record<string, unknown>)['TwilioCompliance'];
    runInThisContext(readFileSync(bundlePath, 'utf-8'));
    expect((window as Record<string, unknown>)['TwilioCompliance']).toBe(before);
  });
});
