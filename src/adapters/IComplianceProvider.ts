import type { TwilioComplianceConfig } from '../core/types';

/**
 * Internal interface that every vendor adapter must implement.
 * Never exported to SDK consumers.
 */
export interface IComplianceProvider {
  open(): void;
  cancel(force?: boolean): void;
  destroy(): void;
}

/**
 * Constructor signature all adapters must conform to.
 * Allows TwilioCompliance core to instantiate adapters without importing
 * concrete implementations directly.
 */
export interface IComplianceProviderConstructor {
  new (config: TwilioComplianceConfig): IComplianceProvider;
}
