/**
 * Padding applied to the inline rendering mode.
 * Values are in pixels. Ignored in modal (overlay) mode.
 */
export interface WidgetPadding {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

/**
 * A filtered SDK-level event delivered to onEvent.
 * Only a curated subset of provider events is forwarded (see onEvent docs).
 */
export interface TwilioEvent {
  /**
   * Event name. Allowed: "start", "page-change", "document-upload",
   * "one-time-link-sent", "one-time-link-start", "one-time-link-exit".
   */
  name: string;
  /** Event-specific metadata. For "page-change", includes pageHeight (number). */
  data?: Record<string, unknown>;
}

/**
 * Payload delivered to the onSubmit callback when the user reaches a terminal screen.
 */
export interface SubmitResult {
  /** Terminal outcome extracted from the screen name (e.g. "success", "failed", "review-pending"). */
  outcome: string;
}

interface TwilioComplianceBaseConfig {
  /** Unique identifier for the pre-created verification session. */
  sessionId: string;
  /** Authentication credential for the verification session. */
  sessionToken: string;

  // ── Localisation / Theming ─────────────────────────────────────────────────
  /** ISO 639-1 language code (e.g. 'en', 'de'). Defaults to provider default. */
  language?: string;

  // ── Layout ─────────────────────────────────────────────────────────────────
  /** Iframe height (CSS value or pixel number). */
  frameHeight?: number | string;
  /** Iframe width (CSS value or pixel number). Provider maximum is 768px. */
  frameWidth?: number | string;
  /** Accessible title for the iframe, read by screen readers. */
  iframeTitle?: string;
  /** Padding for inline rendering mode only (ignored in modal mode). */
  widgetPadding?: WidgetPadding;

  // ── Lifecycle callbacks ────────────────────────────────────────────────────
  /** Fires when the verification UI is loaded and ready for user interaction. */
  onReady?: () => void;
  /**
   * Fires when the user successfully completes the flow.
   * NOTE: Client-side status may be stale — always verify server-side via webhook.
   */
  onComplete?: () => void;
  /** Fires when the user exits the flow without completing. */
  onCancel?: () => void;
  /**
   * Fires when the user reaches a terminal screen of the compliance flow.
   * Independent of onComplete — onSubmit signals arrival at a terminal state,
   * while onComplete signals the user clicking a completion button.
   */
  onSubmit?: (result: SubmitResult) => void;
  /** Fires when an SDK-level failure occurs. */
  onError?: (error: TwilioError) => void;
  /**
   * Fires on a filtered set of flow events useful for analytics and inline resizing.
   * Allowed: "start", "page-change", "document-upload",
   * "one-time-link-sent", "one-time-link-start", "one-time-link-exit".
   */
  onEvent?: (event: TwilioEvent) => void;
}

/**
 * Configuration object passed to TwilioCompliance.create().
 * All callbacks are optional — the SDK will not throw if any are omitted.
 *
 * When inline is true, container is required (type-enforced).
 * When inline is false/absent, container is optional and defaults to document.body.
 */
export type TwilioComplianceConfig = TwilioComplianceBaseConfig & (
  | {
      /** Renders the widget inline inside the given container element. */
      inline: true;
      /** CSS selector or HTMLElement to append the inline iframe into. Required for inline mode. */
      container: string | HTMLElement;
    }
  | {
      /** Modal/overlay mode (default). */
      inline?: false;
      /** CSS selector or HTMLElement for the overlay parent. Defaults to document.body. */
      container?: string | HTMLElement;
    }
);

/**
 * Normalized SDK-level error delivered to onError.
 * Represents SDK lifecycle failures, not HTTP or API errors.
 */
export interface TwilioError {
  /** Twilio numeric error code (e.g. 21706). */
  code: number;
  /** Human-readable description of the error. */
  message: string;
  /** Session ID for support ticket reference. Absent for pre-session errors. */
  sessionId?: string;
}

/** Twilio numeric error codes emitted by the SDK. */
export const TWILIO_ERROR_CODES = {
  /** Internal provider error. */
  INTERNAL_PERSONA_ERROR: 21710,
  /** Invalid SDK initialization. */
  INVALID_CONFIG: 21711,
  /** Session token expired. */
  UNAUTHENTICATED: 21706,
  /** Template misconfiguration. */
  INACTIVE_TEMPLATE: 21712,
  /** Catch-all error. */
  UNKNOWN: 21719,
} as const;
