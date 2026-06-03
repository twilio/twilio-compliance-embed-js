// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TwilioCompliance, TWILIO_ERROR_CODES } from '../../src/index';
import type { TwilioComplianceConfig } from '../../src/index';

// Mock at the PersonaAdapter boundary. Mocking the nested persona SDK directly is
// unreliable when PersonaAdapter is itself loaded via a dynamic import — Vitest's
// mock hoisting only guarantees interception one level deep. Capturing the config
// at construction time lets us fire SDK-level callbacks in each test.
let capturedConfig: TwilioComplianceConfig | null = null;
const mockOpen = vi.fn();
const mockDestroy = vi.fn();

vi.mock('../../src/adapters/PersonaAdapter', () => ({
  PersonaAdapter: vi.fn().mockImplementation((config: TwilioComplianceConfig) => {
    capturedConfig = config;
    return { open: mockOpen, destroy: mockDestroy };
  }),
}));

describe('TwilioCompliance — full lifecycle (jsdom)', () => {
  let onReady: ReturnType<typeof vi.fn>;
  let onComplete: ReturnType<typeof vi.fn>;
  let onCancel: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;
  let sdk: TwilioCompliance;

  beforeEach(async () => {
    capturedConfig = null;
    mockOpen.mockClear();
    mockDestroy.mockClear();
    onReady = vi.fn();
    onComplete = vi.fn();
    onCancel = vi.fn();
    onError = vi.fn();

    sdk = TwilioCompliance.create({
      sessionId: 'inq_123',
      sessionToken: 'tok_abc',
      onReady,
      onComplete,
      onCancel,
      onError,
    });

    // One flush: resolves the dynamic import('../adapters/PersonaAdapter') inside create()/_init().
    await new Promise(resolve => setTimeout(resolve, 0));
    sdk.open();
  });

  it('calls adapter.open() after create() + open()', () => {
    expect(mockOpen).toHaveBeenCalledOnce();
  });

  it('fires onReady when the verification UI is ready', () => {
    capturedConfig?.onReady?.();
    expect(onReady).toHaveBeenCalledOnce();
  });

  it('fires onComplete with no arguments', () => {
    capturedConfig?.onComplete?.();
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith();
  });

  it('fires onCancel with no arguments', () => {
    capturedConfig?.onCancel?.();
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledWith();
  });

  it('fires onError with a TwilioError', () => {
    capturedConfig?.onError?.({
      code: TWILIO_ERROR_CODES.INTERNAL_PERSONA_ERROR,
      message: 'something went wrong',
      sessionId: 'inq_123',
    });
    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith({
      code: TWILIO_ERROR_CODES.INTERNAL_PERSONA_ERROR,
      message: expect.any(String),
      sessionId: 'inq_123',
    });
  });

  it('delegates destroy() to the adapter', () => {
    sdk.destroy();
    expect(mockDestroy).toHaveBeenCalledOnce();
  });
});
