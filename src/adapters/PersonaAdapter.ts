import type { Event } from 'persona';
import type { IComplianceProvider } from './IComplianceProvider';
import type { TwilioComplianceConfig } from '../core/types';
import { TWILIO_ERROR_CODES } from '../core/types';
import { mapError } from '../utils/errorMapper';

const EVENTS_ALLOWLIST = [
  'start',
  'page-change',
  'document-upload',
  'one-time-link-sent',
  'one-time-link-start',
  'one-time-link-exit',
] as const;

const TERMINAL_SCREEN_PREFIX = 'twilio:compliance:terminal:';
// Legacy convention used by older Persona templates: a bare completion marker with no
// encoded outcome (never appears with any suffix in practice, but we use startsWith
// for consistency with how legacy consumers matched it).
const INQUIRY_SUBMITTED_PREFIX = 'twilio_inquiry_completed';

export class PersonaAdapter implements IComplianceProvider {
  private readonly config: TwilioComplianceConfig;
  private personaClient: { open(): void; cancel(force: boolean): void; destroy(): void } | null = null;
  private containerId: string | null = null;
  private destroyed = false;
  private iframe: HTMLIFrameElement | null = null;
  private readonly firedTerminalScreens = new Set<string>();

  static preload(): Promise<void> {
    return import('persona').then((mod) => {
      const Persona = ((mod as unknown as { default?: typeof mod }).default ?? mod);
      return Persona.Client.preload?.() ?? Promise.resolve();
    }).catch(() => Promise.resolve());
  }

  constructor(config: TwilioComplianceConfig) {
    this.config = config;

    if (config.inline) {
      this._initInline();
    } else {
      this._initModal();
    }
  }

  private _initModal(): void {
    const config = this.config;
    const parent = this.resolveContainer(config.container);

    import('persona').then((mod) => {
      if (this.destroyed) return;
      const Persona = ((mod as unknown as { default?: typeof mod }).default ?? mod);
      this.personaClient = new Persona.Client({
        inquiryId: config.sessionId,
        sessionToken: config.sessionToken,
        parent,
        // Enum string values match these literals exactly (see persona's Event enum)
        eventsAllowlist: [...EVENTS_ALLOWLIST] as Event[],

        ...(config.language !== undefined && { language: config.language }),
        ...(config.frameHeight !== undefined && { frameHeight: config.frameHeight }),
        ...(config.frameWidth !== undefined && { frameWidth: config.frameWidth }),
        ...(config.iframeTitle !== undefined && { iframeTitle: config.iframeTitle }),
        ...(config.widgetPadding !== undefined && { widgetPadding: config.widgetPadding }),

        onReady: () => { config.onReady?.(); },
        onComplete: () => { config.onComplete?.(); },
        onCancel: () => { config.onCancel?.(); },

        onError: ({ code }: { status?: number; code: string }) => {
          if (this.destroyed) return;
          const { code: twilioCode, message } = mapError(code);
          config.onError?.({ code: twilioCode, message, sessionId: config.sessionId });
        },

        onEvent: (name: string, metadata?: Record<string, unknown>) => {
          config.onEvent?.({ name, data: metadata });
          this.detectTerminalScreen(name, metadata);
        },
      });
    }).catch(() => {
      if (this.destroyed) return;
      config.onError?.({
        code: TWILIO_ERROR_CODES.INTERNAL_PERSONA_ERROR,
        message: 'Failed to load verification provider',
        sessionId: config.sessionId,
      });
    });
  }

  private _initInline(): void {
    const config = this.config;
    const parent = this.resolveContainer(config.container);
    const iframe = document.createElement('iframe');
    this.iframe = iframe;
    parent.appendChild(iframe);

    const containerId =
      'twilio-compliance-' +
      new Array(16)
        .fill(undefined)
        .map(() => Math.floor(Math.random() * 35).toString(35))
        .join('');
    this.containerId = containerId;

    import('persona').then((mod) => {
      if (this.destroyed) {
        iframe.remove();
        return;
      }
      const Persona = ((mod as unknown as { default?: typeof mod }).default ?? mod);
      Persona.setupEvents(containerId, {
        onLoad: () => {},
        onReady: () => { config.onReady?.(); },
        onComplete: () => { config.onComplete?.(); },
        onCancel: () => { config.onCancel?.(); },
        onError: ({ code }: { status?: number; code: string }) => {
          if (this.destroyed) return;
          const { code: twilioCode, message } = mapError(code);
          config.onError?.({ code: twilioCode, message, sessionId: config.sessionId });
        },
        onEvent: (name: string, metadata?: Record<string, unknown>) => {
          config.onEvent?.({ name, data: metadata });
          this.detectTerminalScreen(name, metadata);
        },
        templateId: null,
        templateVersionId: null,
        host: null,
        // Enum string values match these literals exactly (see persona's Event enum)
        eventsAllowlist: [...EVENTS_ALLOWLIST] as Event[],
      });

      Persona.setupIframe(iframe, containerId, 'inline', {
        inquiryId: config.sessionId,
        sessionToken: config.sessionToken,
        ...(config.language !== undefined && { language: config.language }),
        ...(config.frameHeight !== undefined && { frameHeight: config.frameHeight }),
        ...(config.frameWidth !== undefined && { frameWidth: config.frameWidth }),
        ...(config.iframeTitle !== undefined && { iframeTitle: config.iframeTitle }),
        ...(config.widgetPadding !== undefined && { widgetPadding: config.widgetPadding }),
      });

      this.personaClient = {
        open: () => {},
        cancel: () => {},
        destroy: () => { iframe.remove(); },
      };
    }).catch(() => {
      if (this.destroyed) return;
      iframe.remove();
      this.iframe = null;
      config.onError?.({
        code: TWILIO_ERROR_CODES.INTERNAL_PERSONA_ERROR,
        message: 'Failed to load verification provider',
        sessionId: config.sessionId,
      });
    });
  }

  open(): void {
    this.personaClient?.open();
  }

  cancel(force?: boolean): void {
    this.personaClient?.cancel(force ?? false);
  }

  destroy(): void {
    this.destroyed = true;
    this.personaClient?.destroy();
    this.personaClient = null;
    this.iframe?.remove();
    this.iframe = null;
  }

  private detectTerminalScreen(eventName: string, metadata?: Record<string, unknown>): void {
    if (eventName !== 'page-change') return;
    const screenName = metadata?.name as string | undefined;
    if (!screenName) return;

    if (screenName.startsWith(TERMINAL_SCREEN_PREFIX)) {
      const suffix = screenName.slice(TERMINAL_SCREEN_PREFIX.length);
      const outcome = suffix.split(':')[0];
      if (!outcome) return;
      if (this.firedTerminalScreens.has(screenName)) return;
      this.firedTerminalScreens.add(screenName);
      this.config.onSubmit?.({ outcome });
      return;
    }

    if (screenName.startsWith(INQUIRY_SUBMITTED_PREFIX)) {
      if (this.firedTerminalScreens.has(screenName)) return;
      this.firedTerminalScreens.add(screenName);
      this.config.onSubmit?.({ outcome: 'submitted' });
    }
  }

  private resolveContainer(selector?: string | HTMLElement): HTMLElement {
    if (!selector) return document.body;
    if (selector instanceof HTMLElement) return selector;
    try {
      const el = document.querySelector<HTMLElement>(selector);
      return el ?? document.body;
    } catch {
      return document.body;
    }
  }
}
