# @twilio/twilio-compliance-embed-js

The official JavaScript SDK for Twilio Compliance Embed.

## Installation

```bash
npm install @twilio/twilio-compliance-embed-js
```

## Usage

```ts
import { TwilioCompliance } from '@twilio/twilio-compliance-embed-js';

// Optional: pre-warm the verification provider at app startup
// TwilioCompliance.preload();

let sdk: ReturnType<typeof TwilioCompliance.create>;
sdk = TwilioCompliance.create({
  sessionId: 'your-session-id',
  sessionToken: 'your-session-token',
  container: '#compliance-mount', // optional in modal mode; required in inline mode

  // Layout / localisation (all optional)
  language: 'en',
  frameHeight: 650,
  frameWidth: 400,
  iframeTitle: 'Identity Verification',
  widgetPadding: { top: 0, bottom: 0, left: 0, right: 0 },

  // Verification UI is ready — call open() to display it
  onReady: () => sdk.open(),

  onComplete: () => console.log('verification completed'),
  onCancel: () => console.log('cancelled'),
  onError: (error) => {
    // error.code    - Twilio error code (e.g. 21706)
    // error.message - Human-readable description
    // error.sessionId - Present for runtime errors; absent for config errors
    console.error(`Compliance error ${error.code}: ${error.message}`);
  },
  onEvent: (event) => {
    // event.name - one of: 'start', 'page-change', 'document-upload',
    //              'one-time-link-sent', 'one-time-link-start', 'one-time-link-exit'
    // event.data - optional metadata object
    console.log('event', event.name, event.data);
  },
});
// create() initialises the SDK in the background; onReady fires when ready

// ── Inline mode ────────────────────────────────────────────────────────────
// let inlineSdk: ReturnType<typeof TwilioCompliance.create>;
// inlineSdk = TwilioCompliance.create({
//   sessionId: 'your-session-id',
//   sessionToken: 'your-session-token',
//   inline: true,
//   container: '#compliance-mount', // required — an <iframe> is appended as a child
//   onReady: () => inlineSdk.open(),
//   onComplete: () => console.log('verification completed'),
// });

// Close the active flow with an optional confirmation dialog (force=false) or immediately (force=true)
// sdk.cancel();        // shows confirmation dialog
// sdk.cancel(true);    // closes immediately without dialog

// Clean up when done (route change, component unmount, etc.)
// sdk.destroy();
```

## API

### `TwilioCompliance.create(config)`

The config is mode-dependent — `inline` determines whether `container` is required.

**Modal mode** (default):

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `sessionId` | `string` | Yes | Pre-created verification session ID |
| `sessionToken` | `string` | Yes | Authentication token for the session |
| `container` | `string \| HTMLElement` | No | CSS selector or element for the overlay parent. Defaults to `document.body` |
| `inline` | `false` | No | Omit or set to `false` for modal mode |
| `language` | `string` | No | Locale code for the verification UI (e.g. `'en'`, `'es'`) |
| `frameHeight` | `number \| string` | No | Height of the verification iframe |
| `frameWidth` | `number \| string` | No | Width of the verification iframe |
| `iframeTitle` | `string` | No | Accessible title for the iframe element |
| `widgetPadding` | `WidgetPadding` | No | Padding around the widget (`{ top?, bottom?, left?, right? }` in px) |
| `onReady` | `() => void` | No | Fires when the verification UI is ready — call `sdk.open()` here |
| `onComplete` | `() => void` | No | Fires on successful verification |
| `onCancel` | `() => void` | No | Fires when the user exits without completing |
| `onError` | `(error: TwilioError) => void` | No | Fires on SDK-level failure — see error codes below |
| `onEvent` | `(event: TwilioEvent) => void` | No | Fires on notable verification flow events |

**Inline mode** (`inline: true`):

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `sessionId` | `string` | Yes | Pre-created verification session ID |
| `sessionToken` | `string` | Yes | Authentication token for the session |
| `inline` | `true` | Yes | Enables inline rendering |
| `container` | `string \| HTMLElement` | Yes | CSS selector or element to append the inline iframe into |
| `language` | `string` | No | Locale code for the verification UI (e.g. `'en'`, `'es'`) |
| `frameHeight` | `number \| string` | No | Height of the verification iframe |
| `frameWidth` | `number \| string` | No | Width of the verification iframe |
| `iframeTitle` | `string` | No | Accessible title for the iframe element |
| `widgetPadding` | `WidgetPadding` | No | Padding around the widget (`{ top?, bottom?, left?, right? }` in px) |
| `onReady` | `() => void` | No | Fires when the verification UI is ready — call `sdk.open()` here |
| `onComplete` | `() => void` | No | Fires on successful verification |
| `onCancel` | `() => void` | No | Fires when the user exits without completing |
| `onError` | `(error: TwilioError) => void` | No | Fires on SDK-level failure — see error codes below |
| `onEvent` | `(event: TwilioEvent) => void` | No | Fires on notable verification flow events |

### `TwilioCompliance.preload()`

Pre-warms the verification provider in the background, so the UI appears faster when `open()` is called. Safe to call at app startup — no UI is shown. No-op in SSR environments. Returns a `Promise<void>`.

### `sdk.open()`

Displays the verification UI. Call this from within `onReady` — by that point the SDK is fully initialised and ready to display. Silent no-op if called before the SDK is ready, after `destroy()`, or in SSR environments.

### `sdk.cancel(force?)`

Closes the active verification flow. When `force` is `false` (default) the provider shows a confirmation dialog before closing. When `force` is `true` the flow closes immediately. Silent no-op if the flow is not open or the instance has been destroyed. The instance remains valid after `cancel()`.

### `sdk.destroy()`

Removes all SDK-allocated DOM elements and event listeners. Safe to call multiple times. The instance is no longer usable after `destroy()`.

### `TwilioEvent`

The `onEvent` callback receives an object with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Event name (see allowed values below) |
| `data` | `Record<string, unknown> \| undefined` | Optional event metadata |

Allowed event names: `start`, `page-change`, `document-upload`, `one-time-link-sent`, `one-time-link-start`, `one-time-link-exit`.

### `TwilioError`

The `onError` callback receives an object with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `code` | `number` | Twilio numeric error code |
| `message` | `string` | Human-readable description |
| `sessionId` | `string \| undefined` | Present for runtime errors; absent for configuration errors |

### Error codes

| Code | Meaning |
|------|---------|
| `21706` | Session token expired — fetch a new session token and reinitialise |
| `21710` | Internal provider error |
| `21711` | Invalid SDK initialization — check `sessionId`, `sessionToken`, and (in inline mode) `container` |
| `21712` | Template misconfiguration — contact Twilio support |
| `21719` | Unexpected error |

## SSR

Safe to import and call `create()` in server-side environments. SDK initialisation is skipped server-side; `open()` and `cancel()` are silent no-ops outside a browser context. `preload()` returns a resolved promise immediately in Node.js.
