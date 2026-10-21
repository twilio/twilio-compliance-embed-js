// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TWILIO_ERROR_CODES } from '../../src/core/types';
import type { TwilioComplianceConfig } from '../../src/core/types';

// Capture the config object passed to Persona.Client so tests can fire synthetic events
let capturedCallbacks: Record<string, (...args: unknown[]) => void> = {};
let capturedConfig: Record<string, unknown> = {};
let mockPersonaClient: { open: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> };

// Captured args for inline-mode setup calls
let capturedSetupEventsId: string = '';
let capturedSetupIframeEl: HTMLIFrameElement | null = null;
let capturedSetupIframeId: string = '';
let capturedSetupIframeMode: string = '';
let capturedSetupIframeOpts: Record<string, unknown> = {};

vi.mock('persona', () => ({
  default: {
    Client: vi.fn().mockImplementation(function (config: Record<string, unknown>) {
      capturedConfig = config;
      capturedCallbacks = config as typeof capturedCallbacks;
      mockPersonaClient = { open: vi.fn(), cancel: vi.fn(), destroy: vi.fn() };
      return mockPersonaClient;
    }),
    setupEvents: vi.fn().mockImplementation((id: string, config: Record<string, unknown>) => {
      capturedSetupEventsId = id;
      capturedCallbacks = config as typeof capturedCallbacks;
    }),
    setupIframe: vi.fn().mockImplementation(
      (el: HTMLIFrameElement, id: string, mode: string, opts: Record<string, unknown>) => {
        capturedSetupIframeEl = el;
        capturedSetupIframeId = id;
        capturedSetupIframeMode = mode;
        capturedSetupIframeOpts = opts;
      },
    ),
    preload: vi.fn().mockResolvedValue(undefined),
  },
}));

// Import after mock is set up
import { PersonaAdapter } from '../../src/adapters/PersonaAdapter';

describe('PersonaAdapter', () => {
  let onReady: ReturnType<typeof vi.fn>;
  let onComplete: ReturnType<typeof vi.fn>;
  let onCancel: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;
  let adapter: PersonaAdapter;

  beforeEach(async () => {
    capturedCallbacks = {};
    capturedConfig = {};
    onReady = vi.fn();
    onComplete = vi.fn();
    onCancel = vi.fn();
    onError = vi.fn();

    const config: TwilioComplianceConfig = {
      sessionId: 'inq_test123',
      sessionToken: 'tok_test456',
      onReady,
      onComplete,
      onCancel,
      onError,
    };

    adapter = new PersonaAdapter(config);
    // Flush the microtask queue so the dynamic import('persona') resolves
    // and Persona.Client is instantiated before assertions run.
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  describe('open()', () => {
    it('calls personaClient.open() when invoked', () => {
      adapter.open();
      expect(mockPersonaClient.open).toHaveBeenCalledOnce();
    });

    it('does not call personaClient.open() automatically on construction', () => {
      expect(mockPersonaClient.open).not.toHaveBeenCalled();
    });
  });

  describe('cancel()', () => {
    it('delegates cancel() with false when called with no args', () => {
      adapter.cancel();
      expect(mockPersonaClient.cancel).toHaveBeenCalledWith(false);
    });

    it('delegates cancel(true) as cancel(true)', () => {
      adapter.cancel(true);
      expect(mockPersonaClient.cancel).toHaveBeenCalledWith(true);
    });

    it('delegates cancel(false) as cancel(false)', () => {
      adapter.cancel(false);
      expect(mockPersonaClient.cancel).toHaveBeenCalledWith(false);
    });

    it('is a safe no-op when personaClient is null (before init or after destroy)', () => {
      adapter.destroy(); // sets personaClient to null
      expect(() => adapter.cancel()).not.toThrow();
    });
  });

  describe('callback normalization', () => {
    it('passes onReady through directly', () => {
      capturedCallbacks.onReady?.();
      expect(onReady).toHaveBeenCalledOnce();
    });

    it('calls onComplete with no arguments, dropping all Persona vendor args', () => {
      capturedCallbacks.onComplete?.();

      expect(onComplete).toHaveBeenCalledOnce();
      expect(onComplete).toHaveBeenCalledWith();
    });

    it('fires onCancel with no arguments, dropping Persona vendor args', () => {
      capturedCallbacks.onCancel?.({ inquiryId: 'inq_test123', sessionToken: 'tok' });
      expect(onCancel).toHaveBeenCalledOnce();
      expect(onCancel).toHaveBeenCalledWith();
    });

    it('maps Persona onError: unauthenticated → code 21706 with sessionId', () => {
      capturedCallbacks.onError?.({ code: 'unauthenticated' });

      expect(onError).toHaveBeenCalledOnce();
      expect(onError).toHaveBeenCalledWith({
        code: TWILIO_ERROR_CODES.UNAUTHENTICATED,
        message: 'Session token expired',
        sessionId: 'inq_test123',
      });
    });

    it('maps Persona onError: application_error → code 21710', () => {
      capturedCallbacks.onError?.({ code: 'application_error' });
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: TWILIO_ERROR_CODES.INTERNAL_PERSONA_ERROR, sessionId: 'inq_test123' }),
      );
    });

    it('maps Persona onError: unknown code → code 21719', () => {
      capturedCallbacks.onError?.({ code: 'some_new_code' });
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: TWILIO_ERROR_CODES.UNKNOWN, sessionId: 'inq_test123' }),
      );
    });
  });

  describe('onEvent callback', () => {
    let onEvent: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      onEvent = vi.fn();
      capturedCallbacks = {};
      capturedConfig = {};
      adapter = new PersonaAdapter({
        sessionId: 'inq_test123',
        sessionToken: 'tok_test456',
        onEvent,
      });
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('passes eventsAllowlist to Persona Client', () => {
      expect(capturedConfig.eventsAllowlist).toEqual([
        'start',
        'page-change',
        'document-upload',
        'one-time-link-sent',
        'one-time-link-start',
        'one-time-link-exit',
      ]);
    });

    it('forwards event with name and no data', () => {
      capturedCallbacks.onEvent?.('start', undefined);
      expect(onEvent).toHaveBeenCalledOnce();
      expect(onEvent).toHaveBeenCalledWith({ name: 'start', data: undefined });
    });

    it.each([
      'start',
      'page-change',
      'document-upload',
      'one-time-link-sent',
      'one-time-link-start',
      'one-time-link-exit',
    ])('forwards event "%s" with metadata', (eventName) => {
      capturedCallbacks.onEvent?.(eventName, { foo: 'bar' });
      expect(onEvent).toHaveBeenCalledWith({ name: eventName, data: { foo: 'bar' } });
    });

    it('is a safe no-op when onEvent is not configured', async () => {
      const adapterNoEvent = new PersonaAdapter({ sessionId: 'inq_test123', sessionToken: 'tok_test456' });
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(() => capturedCallbacks.onEvent?.('start', {})).not.toThrow();
      adapterNoEvent.destroy();
    });
  });

  describe('onSubmit — terminal screen detection', () => {
    let onSubmit: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      onSubmit = vi.fn();
      capturedCallbacks = {};
      capturedConfig = {};
      adapter = new PersonaAdapter({
        sessionId: 'inq_test123',
        sessionToken: 'tok_test456',
        onSubmit,
      });
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('fires onSubmit with outcome when page-change has a terminal screen name', () => {
      capturedCallbacks.onEvent?.('page-change', { name: 'twilio:compliance:terminal:success' });
      expect(onSubmit).toHaveBeenCalledOnce();
      expect(onSubmit).toHaveBeenCalledWith({ outcome: 'success' });
    });

    it('fires onSubmit with "failed" outcome', () => {
      capturedCallbacks.onEvent?.('page-change', { name: 'twilio:compliance:terminal:failed' });
      expect(onSubmit).toHaveBeenCalledWith({ outcome: 'failed' });
    });

    it('fires onSubmit with "review-pending" outcome', () => {
      capturedCallbacks.onEvent?.('page-change', { name: 'twilio:compliance:terminal:review-pending' });
      expect(onSubmit).toHaveBeenCalledWith({ outcome: 'review-pending' });
    });

    it('extracts only the first segment as outcome when extra colon-separated segments exist', () => {
      capturedCallbacks.onEvent?.('page-change', { name: 'twilio:compliance:terminal:success:1' });
      expect(onSubmit).toHaveBeenCalledWith({ outcome: 'success' });
    });

    it('does not fire onSubmit for non-page-change events', () => {
      capturedCallbacks.onEvent?.('start', { name: 'twilio:compliance:terminal:success' });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not fire onSubmit when screen name does not start with the reserved prefix', () => {
      capturedCallbacks.onEvent?.('page-change', { name: 'screen_abc123' });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not fire onSubmit when screen name has the prefix but empty outcome', () => {
      capturedCallbacks.onEvent?.('page-change', { name: 'twilio:compliance:terminal:' });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not fire onSubmit when metadata has no name field', () => {
      capturedCallbacks.onEvent?.('page-change', { pageHeight: 500 });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not fire onSubmit when metadata is undefined', () => {
      capturedCallbacks.onEvent?.('page-change', undefined);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('fires onSubmit only once per distinct terminal screen (idempotent)', () => {
      capturedCallbacks.onEvent?.('page-change', { name: 'twilio:compliance:terminal:success' });
      capturedCallbacks.onEvent?.('page-change', { name: 'twilio:compliance:terminal:success' });
      expect(onSubmit).toHaveBeenCalledOnce();
    });

    it('fires onSubmit for each distinct terminal screen', () => {
      capturedCallbacks.onEvent?.('page-change', { name: 'twilio:compliance:terminal:success' });
      capturedCallbacks.onEvent?.('page-change', { name: 'twilio:compliance:terminal:failed' });
      expect(onSubmit).toHaveBeenCalledTimes(2);
      expect(onSubmit).toHaveBeenCalledWith({ outcome: 'success' });
      expect(onSubmit).toHaveBeenCalledWith({ outcome: 'failed' });
    });

    it('is a safe no-op when onSubmit is not configured', async () => {
      const adapterNoSubmit = new PersonaAdapter({ sessionId: 'inq_test123', sessionToken: 'tok_test456' });
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(() => capturedCallbacks.onEvent?.('page-change', { name: 'twilio:compliance:terminal:success' })).not.toThrow();
      adapterNoSubmit.destroy();
    });

    it('fires onSubmit with outcome "submitted" for the legacy twilio_inquiry_completed page name', () => {
      capturedCallbacks.onEvent?.('page-change', { name: 'twilio_inquiry_completed' });
      expect(onSubmit).toHaveBeenCalledOnce();
      expect(onSubmit).toHaveBeenCalledWith({ outcome: 'submitted' });
    });

    it('fires onSubmit with outcome "submitted" when the legacy page name has extra suffix content', () => {
      capturedCallbacks.onEvent?.('page-change', { name: 'twilio_inquiry_completed_extra' });
      expect(onSubmit).toHaveBeenCalledOnce();
      expect(onSubmit).toHaveBeenCalledWith({ outcome: 'submitted' });
    });

    it('does not fire the legacy branch for a reserved-prefix terminal screen name', () => {
      capturedCallbacks.onEvent?.('page-change', { name: 'twilio:compliance:terminal:success' });
      expect(onSubmit).toHaveBeenCalledOnce();
      expect(onSubmit).toHaveBeenCalledWith({ outcome: 'success' });
    });

    it('fires onSubmit only once per distinct legacy screen name (idempotent)', () => {
      capturedCallbacks.onEvent?.('page-change', { name: 'twilio_inquiry_completed' });
      capturedCallbacks.onEvent?.('page-change', { name: 'twilio_inquiry_completed' });
      expect(onSubmit).toHaveBeenCalledOnce();
    });
  });

  describe('layout and localisation config pass-through', () => {
    beforeEach(async () => {
      capturedCallbacks = {};
      capturedConfig = {};
      adapter = new PersonaAdapter({
        sessionId: 'inq_test123',
        sessionToken: 'tok_test456',
        language: 'es',
        frameHeight: 600,
        frameWidth: '100%',
        iframeTitle: 'Verify identity',
        widgetPadding: { top: 10, bottom: 20 },
      });
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('passes language directly', () => {
      expect(capturedConfig.language).toBe('es');
    });

    it('passes frameHeight and frameWidth', () => {
      expect(capturedConfig.frameHeight).toBe(600);
      expect(capturedConfig.frameWidth).toBe('100%');
    });

    it('passes iframeTitle', () => {
      expect(capturedConfig.iframeTitle).toBe('Verify identity');
    });

    it('passes widgetPadding to Persona', () => {
      expect(capturedConfig.widgetPadding).toEqual({ top: 10, bottom: 20 });
    });

    it('does not include undefined optional keys', async () => {
      capturedConfig = {};
      const bareAdapter = new PersonaAdapter({ sessionId: 'inq_test123', sessionToken: 'tok_test456' });
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(capturedConfig).not.toHaveProperty('language');
      bareAdapter.destroy();
    });
  });

  describe('container option', () => {
    it('accepts an HTMLElement directly as parent', async () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      capturedConfig = {};
      const adapterEl = new PersonaAdapter({
        sessionId: 'inq_test123',
        sessionToken: 'tok_test456',
        container: el,
      });
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(capturedConfig.parent).toBe(el);
      adapterEl.destroy();
      document.body.removeChild(el);
    });

    it('resolves a CSS selector string to an HTMLElement', async () => {
      const el = document.createElement('div');
      el.id = 'persona-mount';
      document.body.appendChild(el);
      capturedConfig = {};
      const adapterSel = new PersonaAdapter({
        sessionId: 'inq_test123',
        sessionToken: 'tok_test456',
        container: '#persona-mount',
      });
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(capturedConfig.parent).toBe(el);
      adapterSel.destroy();
      document.body.removeChild(el);
    });

    it('falls back to document.body when selector matches nothing', async () => {
      capturedConfig = {};
      const adapterFallback = new PersonaAdapter({
        sessionId: 'inq_test123',
        sessionToken: 'tok_test456',
        container: '#nonexistent',
      });
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(capturedConfig.parent).toBe(document.body);
      adapterFallback.destroy();
    });
  });

  describe('destroy()', () => {
    it('nulls the client reference so a second destroy() is a safe no-op', () => {
      expect(() => {
        adapter.destroy();
        adapter.destroy();
      }).not.toThrow();
    });
  });
});

describe('PersonaAdapter — inline mode', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    capturedCallbacks = {};
    capturedSetupEventsId = '';
    capturedSetupIframeEl = null;
    capturedSetupIframeId = '';
    capturedSetupIframeMode = '';
    capturedSetupIframeOpts = {};

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  async function makeInlineAdapter(extra: Partial<TwilioComplianceConfig> = {}) {
    const a = new PersonaAdapter({
      sessionId: 'inq_inline',
      sessionToken: 'tok_inline',
      inline: true,
      container,
      ...extra,
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    return a;
  }

  it('appends an <iframe> child to the container', async () => {
    await makeInlineAdapter();
    expect(container.querySelector('iframe')).not.toBeNull();
  });

  it('calls Persona.setupEvents with a generated containerId', async () => {
    await makeInlineAdapter();
    expect(capturedSetupEventsId).toMatch(/^twilio-compliance-[0-9a-z]{16}$/);
  });

  it('passes the same containerId to setupEvents and setupIframe', async () => {
    await makeInlineAdapter();
    expect(capturedSetupEventsId).toBe(capturedSetupIframeId);
  });

  it('calls Persona.setupIframe with the created iframe element', async () => {
    await makeInlineAdapter();
    expect(capturedSetupIframeEl).toBe(container.querySelector('iframe'));
  });

  it('calls Persona.setupIframe with mode "inline"', async () => {
    await makeInlineAdapter();
    expect(capturedSetupIframeMode).toBe('inline');
  });

  it('passes sessionToken to setupIframe opts', async () => {
    await makeInlineAdapter();
    expect(capturedSetupIframeOpts.sessionToken).toBe('tok_inline');
  });

  it('does not call Persona.Client in inline mode', async () => {
    const { default: Persona } = await import('persona');
    (Persona.Client as ReturnType<typeof vi.fn>).mockClear();
    await makeInlineAdapter();
    expect(Persona.Client).not.toHaveBeenCalled();
  });

  it('forwards onReady via setupEvents', async () => {
    const onReady = vi.fn();
    await makeInlineAdapter({ onReady });
    capturedCallbacks.onReady?.();
    expect(onReady).toHaveBeenCalledOnce();
  });

  it('forwards onComplete via setupEvents, dropping vendor args', async () => {
    const onComplete = vi.fn();
    await makeInlineAdapter({ onComplete });
    capturedCallbacks.onComplete?.();
    expect(onComplete).toHaveBeenCalledWith();
  });

  it('forwards onCancel via setupEvents, dropping vendor args', async () => {
    const onCancel = vi.fn();
    await makeInlineAdapter({ onCancel });
    capturedCallbacks.onCancel?.();
    expect(onCancel).toHaveBeenCalledWith();
  });

  it('maps onError through mapError in inline mode', async () => {
    const onError = vi.fn();
    await makeInlineAdapter({ onError });
    capturedCallbacks.onError?.({ code: 'unauthenticated' });
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: TWILIO_ERROR_CODES.UNAUTHENTICATED, sessionId: 'inq_inline' }),
    );
  });

  it('passes eventsAllowlist to setupEvents in inline mode', async () => {
    await makeInlineAdapter();
    expect((capturedCallbacks as Record<string, unknown>).eventsAllowlist).toEqual([
      'start',
      'page-change',
      'document-upload',
      'one-time-link-sent',
      'one-time-link-start',
      'one-time-link-exit',
    ]);
  });

  it('forwards onEvent in inline mode', async () => {
    const onEvent = vi.fn();
    await makeInlineAdapter({ onEvent });
    capturedCallbacks.onEvent?.('start', { foo: 1 });
    expect(onEvent).toHaveBeenCalledWith({ name: 'start', data: { foo: 1 } });
  });

  it('fires onSubmit on terminal page-change in inline mode', async () => {
    const onSubmit = vi.fn();
    await makeInlineAdapter({ onSubmit });
    capturedCallbacks.onEvent?.('page-change', { name: 'twilio:compliance:terminal:success' });
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith({ outcome: 'success' });
  });

  it('fires onSubmit with outcome "submitted" on legacy page-change in inline mode', async () => {
    const onSubmit = vi.fn();
    await makeInlineAdapter({ onSubmit });
    capturedCallbacks.onEvent?.('page-change', { name: 'twilio_inquiry_completed' });
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith({ outcome: 'submitted' });
  });

  it('resolves container by CSS selector string', async () => {
    container.id = 'inline-host';
    capturedSetupIframeEl = null;
    const a = new PersonaAdapter({
      sessionId: 'inq_inline',
      sessionToken: 'tok_inline',
      inline: true,
      container: '#inline-host',
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(capturedSetupIframeEl).toBe(container.querySelector('iframe'));
    a.destroy();
  });

  it('destroy() removes the iframe from the DOM', async () => {
    const a = await makeInlineAdapter();
    expect(container.querySelector('iframe')).not.toBeNull();
    a.destroy();
    expect(container.querySelector('iframe')).toBeNull();
  });
});
