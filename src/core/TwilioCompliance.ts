import { TWILIO_ERROR_CODES } from './types';
import type { TwilioComplianceConfig } from './types';
import type { IComplianceProvider } from '../adapters/IComplianceProvider';

/**
 * The main entry point for the TwilioCompliance SDK.
 * Use the static `create()` factory — do not instantiate directly.
 *
 * Core depends only on IComplianceProvider — no concrete adapter is imported here.
 * PersonaAdapter (and the persona SDK) are loaded via dynamic import inside open(),
 * so this module is safe to evaluate in SSR/Node environments.
 */
export class TwilioCompliance {
  private readonly config: TwilioComplianceConfig | null;
  private adapter: IComplianceProvider | null = null;
  private _isOpen = false;
  private _destroyed = false;

  private constructor(config: TwilioComplianceConfig | null) {
    this.config = config;
  }

  /**
   * Creates a new TwilioCompliance instance and begins loading the Persona SDK
   * in the background. The verification UI will not appear until open() is called
   * (typically from within the onReady callback).
   *
   * Validates required config fields synchronously and fires onError with
   * INVALID_CONFIG if sessionId or sessionToken is missing.
   *
   * Safe to call in SSR environments — _init() is skipped server-side.
   */
  static create(config: TwilioComplianceConfig): TwilioCompliance {
    if (!config.sessionId || !config.sessionToken) {
      config.onError?.({
        code: TWILIO_ERROR_CODES.INVALID_CONFIG,
        message: 'sessionId and sessionToken are required',
      });
      return new TwilioCompliance(null);
    }

    if (config.inline && !config.container) {
      config.onError?.({
        code: TWILIO_ERROR_CODES.INVALID_CONFIG,
        message: 'container is required when inline is true',
      });
      return new TwilioCompliance(null);
    }

    const instance = new TwilioCompliance(config);
    if (typeof window !== 'undefined') {
      instance._init();
    }
    return instance;
  }

  /**
   * Pre-warms the verification provider bundle so it is ready before open() is called.
   * Safe to call at app startup — no UI is shown.
   * No-op in SSR environments.
   */
  static preload(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    return import('../adapters/PersonaAdapter').then(({ PersonaAdapter }) => PersonaAdapter.preload());
  }

  private _init(): void {
    import('../adapters/PersonaAdapter').then(({ PersonaAdapter }) => {
      if (this._destroyed) return;
      this.adapter = new PersonaAdapter(this.config!);
    }).catch(() => {
      this.config!.onError?.({
        code: TWILIO_ERROR_CODES.INTERNAL_PERSONA_ERROR,
        message: 'Failed to load verification provider',
        sessionId: this.config!.sessionId,
      });
    });
  }

  /**
   * Opens the verification UI. Call this from within the onReady callback —
   * by that point the Persona client is initialised and ready to display.
   *
   * No-ops silently if already open or if the adapter has not been created yet.
   */
  open(): void {
    if (this._isOpen) return;
    if (!this.adapter) return; // adapter not ready yet — safe no-op, flag not consumed
    this._isOpen = true;
    this.adapter.open();
  }

  /**
   * Closes the active verification flow.
   *
   * When force is false (default), shows the provider's confirmation dialog.
   * When force is true, closes immediately without confirmation.
   *
   * Silent no-op if the flow is not open, the adapter is not ready, or the
   * instance has been destroyed. The instance remains valid after cancel() —
   * open() can be called again.
   */
  cancel(force?: boolean): void {
    if (this._destroyed || !this.adapter) return;
    this._isOpen = false;
    this.adapter.cancel(force);
  }

  /**
   * Removes all SDK-allocated DOM elements, iframes, and event listeners.
   *
   * Safe to call before open(), after open(), after completion, or multiple times.
   * Idempotent — subsequent calls after the first are no-ops.
   */
  destroy(): void {
    this._destroyed = true;
    this.adapter?.destroy();
    this.adapter = null;
    this._isOpen = false;
  }
}
