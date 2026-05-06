import { isReadQueryError } from '@/lib/read-path-policy';

export const APPROVAL_DASHBOARD_READ_FALLBACK_MESSAGE =
  'Approval queue is temporarily unavailable. Please refresh and try again.';

export const APPROVAL_DETAILS_READ_FALLBACK_MESSAGE =
  'Approval line items are temporarily unavailable. Please refresh and try again.';

function getApprovalReadErrorMessage(error: unknown, fallbackMessage: string): string {
  if (isReadQueryError(error) && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

export function getApprovalDashboardReadErrorMessage(error: unknown): string {
  return getApprovalReadErrorMessage(error, APPROVAL_DASHBOARD_READ_FALLBACK_MESSAGE);
}

export function getApprovalDetailsReadErrorMessage(error: unknown): string {
  return getApprovalReadErrorMessage(error, APPROVAL_DETAILS_READ_FALLBACK_MESSAGE);
}
