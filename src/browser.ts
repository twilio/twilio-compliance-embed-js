import { TwilioCompliance } from './core/TwilioCompliance';
import { TWILIO_ERROR_CODES } from './core/types';

// Assign flat globals to globalThis (window in browsers).
// Guards:
//   - typeof globalThis check: prevents ReferenceError in exotic environments
//   - ?? operator: idempotent — existing globals are never overwritten on double-load
if (typeof globalThis !== 'undefined') {
  const g = globalThis as Record<string, unknown>;
  g['TwilioCompliance'] = g['TwilioCompliance'] ?? TwilioCompliance;
  g['TWILIO_ERROR_CODES'] = g['TWILIO_ERROR_CODES'] ?? TWILIO_ERROR_CODES;
}
