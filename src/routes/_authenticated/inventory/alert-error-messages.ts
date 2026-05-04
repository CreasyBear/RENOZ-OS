import { formatInventoryMutationError } from '@/hooks/inventory/_mutation-errors';

export const TRIGGERED_ALERTS_UNAVAILABLE_MESSAGE =
  'Triggered inventory alerts are temporarily unavailable. Please refresh and try again.';
export const ALERT_RULES_UNAVAILABLE_MESSAGE =
  'Inventory alert rules are temporarily unavailable. Please refresh and try again.';

export function getAlertRuleSubmitError(error: unknown): string | null {
  if (!error) return null;
  return formatInventoryMutationError(error, 'Failed to save alert rule');
}

export function getTriggeredAlertsReadErrorMessage(error: unknown): string | undefined {
  return error ? TRIGGERED_ALERTS_UNAVAILABLE_MESSAGE : undefined;
}

export function getAlertRulesReadErrorMessage(error: unknown): string | undefined {
  return error ? ALERT_RULES_UNAVAILABLE_MESSAGE : undefined;
}
