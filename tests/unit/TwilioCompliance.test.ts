// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TWILIO_ERROR_CODES } from '../../src/core/types';
import type { TwilioComplianceConfig } from '../../src/core/types';

const mockOpen = vi.fn();
const mockCancel = vi.fn();
const mockDestroy = vi.fn();
const mockPreload = vi.fn().mockResolvedValue(undefined);

vi.mock('../../src/adapters/PersonaAdapter', () => {
  const Ctor = vi.fn().mockImplementation(() => ({
    open: mockOpen,
    cancel: mockCancel,
    destroy: mockDestroy,
  }));
  (Ctor as unknown as Record<string, unknown>).preload = mockPreload;
  return { PersonaAdapter: Ctor };
});

import { TwilioCompliance } from '../../src/index';

describe('TwilioCompliance', () => {
  let onError: ReturnType<typeof vi.fn>;
  let baseConfig: TwilioComplianceConfig;

  beforeEach(() => {
    onError = vi.fn();
    mockOpen.mockClear();
    mockCancel.mockClear();
    mockDestroy.mockClear();
    mockPreload.mockClear();
    baseConfig = {
      sessionId: 'sess_abc',
      sessionToken: 'tok_xyz',
      onError,
    };
  });

  describe('create()', () => {
    it('returns an instance without firing onError for valid config', () => {
      const sdk = TwilioCompliance.create(baseConfig);
      expect(sdk).toBeInstanceOf(TwilioCompliance);
      expect(onError).not.toHaveBeenCalled();
    });

    it('fires onError with INVALID_CONFIG (21711) synchronously when sessionId is missing', () => {
      const config = { ...baseConfig, sessionId: '' };
      TwilioCompliance.create(config);
      expect(onError).toHaveBeenCalledOnce();
      const err = onError.mock.calls[0][0];
      expect(err.code).toBe(TWILIO_ERROR_CODES.INVALID_CONFIG);
      expect(err.message).toEqual(expect.any(String));
      expect(err).not.toHaveProperty('sessionId');
    });

    it('fires onError with INVALID_CONFIG (21711) synchronously when sessionToken is missing', () => {
      const config = { ...baseConfig, sessionToken: '' };
      TwilioCompliance.create(config);
      expect(onError).toHaveBeenCalledOnce();
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: TWILIO_ERROR_CODES.INVALID_CONFIG }),
      );
    });

    it('does not throw when onError callback is not provided', () => {
      const config = { sessionId: '', sessionToken: '' };
      expect(() => TwilioCompliance.create(config)).not.toThrow();
    });

    it('fires onError with INVALID_CONFIG synchronously when inline is true but container is missing', () => {
      TwilioCompliance.create({ ...baseConfig, inline: true });
      expect(onError).toHaveBeenCalledOnce();
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: TWILIO_ERROR_CODES.INVALID_CONFIG }),
      );
    });

    it('does not fire onError when inline is true and container is provided', () => {
      const el = document.createElement('div');
      TwilioCompliance.create({ ...baseConfig, inline: true, container: el });
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('open()', () => {
    it('delegates to adapter.open() on first call', async () => {
      const sdk = TwilioCompliance.create(baseConfig);
      await new Promise(resolve => setTimeout(resolve, 0)); // wait for _init() to create adapter
      sdk.open();
      expect(mockOpen).toHaveBeenCalledOnce();
    });

    it('is a no-op on second call without intervening destroy() (double-open guard)', async () => {
      const sdk = TwilioCompliance.create(baseConfig);
      await new Promise(resolve => setTimeout(resolve, 0));
      sdk.open();
      sdk.open();
      expect(mockOpen).toHaveBeenCalledOnce();
    });

    it('is a no-op when config was invalid (null adapter guard)', () => {
      const sdk = TwilioCompliance.create({ ...baseConfig, sessionId: '' });
      sdk.open();
      expect(mockOpen).not.toHaveBeenCalled();
    });

    it('does not consume the open slot when called before _init() resolves', async () => {
      const sdk = TwilioCompliance.create(baseConfig);
      sdk.open(); // adapter is null — must not set _isOpen
      await new Promise(resolve => setTimeout(resolve, 0)); // adapter now set
      sdk.open(); // this must succeed
      expect(mockOpen).toHaveBeenCalledOnce();
    });

    it('is a no-op in SSR environments (no window)', () => {
      const win = (globalThis as Record<string, unknown>).window;
      delete (globalThis as Record<string, unknown>).window;

      try {
        const sdk = TwilioCompliance.create(baseConfig);
        sdk.open();
        expect(mockOpen).not.toHaveBeenCalled();
      } finally {
        (globalThis as Record<string, unknown>).window = win;
      }
    });
  });

  describe('cancel()', () => {
    it('delegates cancel() to adapter (no-op default)', async () => {
      const sdk = TwilioCompliance.create(baseConfig);
      await new Promise(resolve => setTimeout(resolve, 0));
      sdk.cancel();
      expect(mockCancel).toHaveBeenCalledOnce();
      expect(mockCancel).toHaveBeenCalledWith(undefined);
    });

    it('delegates cancel(true) to adapter', async () => {
      const sdk = TwilioCompliance.create(baseConfig);
      await new Promise(resolve => setTimeout(resolve, 0));
      sdk.cancel(true);
      expect(mockCancel).toHaveBeenCalledWith(true);
    });

    it('is a safe no-op before adapter resolves', () => {
      const sdk = TwilioCompliance.create(baseConfig);
      expect(() => sdk.cancel()).not.toThrow();
      expect(mockCancel).not.toHaveBeenCalled();
    });

    it('is a safe no-op after destroy()', async () => {
      const sdk = TwilioCompliance.create(baseConfig);
      await new Promise(resolve => setTimeout(resolve, 0));
      sdk.destroy();
      expect(() => sdk.cancel()).not.toThrow();
      expect(mockCancel).not.toHaveBeenCalled();
    });

    it('instance remains usable — open() works after cancel()', async () => {
      const sdk = TwilioCompliance.create(baseConfig);
      await new Promise(resolve => setTimeout(resolve, 0));
      sdk.open();
      sdk.cancel();
      sdk.open();
      expect(mockOpen).toHaveBeenCalledTimes(2);
    });
  });

  describe('destroy()', () => {
    it('delegates to adapter.destroy()', async () => {
      const sdk = TwilioCompliance.create(baseConfig);
      await new Promise(resolve => setTimeout(resolve, 0));
      sdk.destroy();
      expect(mockDestroy).toHaveBeenCalledOnce();
    });

    it('open() after destroy() is a safe no-op', async () => {
      const sdk = TwilioCompliance.create(baseConfig);
      await new Promise(resolve => setTimeout(resolve, 0));
      sdk.destroy();
      sdk.open();
      expect(mockOpen).not.toHaveBeenCalled();
    });

    it('is a safe no-op when called before open()', () => {
      const sdk = TwilioCompliance.create(baseConfig);
      expect(() => sdk.destroy()).not.toThrow();
    });

    it('is a safe no-op when called multiple times', () => {
      const sdk = TwilioCompliance.create(baseConfig);
      sdk.open();
      expect(() => {
        sdk.destroy();
        sdk.destroy();
      }).not.toThrow();
    });

    it('does not throw when adapter is null (invalid config path)', () => {
      const sdk = TwilioCompliance.create({ ...baseConfig, sessionId: '' });
      expect(() => sdk.destroy()).not.toThrow();
    });
  });

  describe('preload()', () => {
    it('returns a Promise', () => {
      const result = TwilioCompliance.preload();
      expect(result).toBeInstanceOf(Promise);
    });

    it('delegates to PersonaAdapter.preload()', async () => {
      await TwilioCompliance.preload();
      expect(mockPreload).toHaveBeenCalledOnce();
    });

    it('is a no-op in SSR environments (no window)', async () => {
      const win = (globalThis as Record<string, unknown>).window;
      delete (globalThis as Record<string, unknown>).window;

      try {
        await TwilioCompliance.preload();
        expect(mockPreload).not.toHaveBeenCalled();
      } finally {
        (globalThis as Record<string, unknown>).window = win;
      }
    });
  });
});
