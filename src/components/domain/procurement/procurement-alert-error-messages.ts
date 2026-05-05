import { isReadQueryError } from '@/lib/read-path-policy';

export const PROCUREMENT_ALERTS_FALLBACK_MESSAGE =
  'Procurement alerts are temporarily unavailable. Please refresh and try again.';

export function getProcurementAlertsErrorMessage(error: unknown): string {
  return isReadQueryError(error) ? error.message : PROCUREMENT_ALERTS_FALLBACK_MESSAGE;
}
