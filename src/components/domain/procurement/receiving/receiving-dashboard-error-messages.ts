import { isReadQueryError } from '@/lib/read-path-policy';

export const RECEIVING_DASHBOARD_FALLBACK_MESSAGE =
  'Purchase orders awaiting receipt are temporarily unavailable. Please refresh and try again.';

export function getReceivingDashboardErrorMessage(error: unknown): string {
  return isReadQueryError(error) ? error.message : RECEIVING_DASHBOARD_FALLBACK_MESSAGE;
}
