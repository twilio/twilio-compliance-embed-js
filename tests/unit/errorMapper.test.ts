import { describe, it, expect } from 'vitest';
import { mapError } from '../../src/utils/errorMapper';
import { TWILIO_ERROR_CODES } from '../../src/core/types';

describe('mapError', () => {
  it('maps "unauthenticated" to UNAUTHENTICATED (21706)', () => {
    const result = mapError('unauthenticated');
    expect(result.code).toBe(TWILIO_ERROR_CODES.UNAUTHENTICATED);
    expect(result.message).toBe('Session token expired');
  });

  it('maps "invalid_config" to INVALID_CONFIG (21711)', () => {
    const result = mapError('invalid_config');
    expect(result.code).toBe(TWILIO_ERROR_CODES.INVALID_CONFIG);
    expect(result.message).toBe('Invalid SDK initialization');
  });

  it('maps "inactive_template" to INACTIVE_TEMPLATE (21712)', () => {
    const result = mapError('inactive_template');
    expect(result.code).toBe(TWILIO_ERROR_CODES.INACTIVE_TEMPLATE);
    expect(result.message).toBe('Template misconfiguration');
  });

  it('maps "application_error" to INTERNAL_PERSONA_ERROR (21710)', () => {
    const result = mapError('application_error');
    expect(result.code).toBe(TWILIO_ERROR_CODES.INTERNAL_PERSONA_ERROR);
    expect(result.message).toBe('Internal provider error');
  });

  it('maps "unknown" to UNKNOWN (21719)', () => {
    const result = mapError('unknown');
    expect(result.code).toBe(TWILIO_ERROR_CODES.UNKNOWN);
  });

  it('maps any unrecognized code to UNKNOWN (21719) (default branch)', () => {
    const result = mapError('some_future_vendor_code');
    expect(result.code).toBe(TWILIO_ERROR_CODES.UNKNOWN);
  });
});
