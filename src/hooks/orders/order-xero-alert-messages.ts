export interface OrderXeroAlertIssue {
  code: string;
  title?: string;
  message: string;
  nextAction: string | null;
  nextActionLabel: string | null;
}

export const ORDER_XERO_ALERT_FALLBACK_MESSAGE =
  'Invoice sync requires attention. Open Xero Sync to review the failed invoice.';

export function getOrderXeroAlertMessage(issue?: OrderXeroAlertIssue | null): string {
  if (!issue) {
    return ORDER_XERO_ALERT_FALLBACK_MESSAGE;
  }

  if (issue.code === 'missing_contact_mapping') {
    return 'Customer needs a trusted Xero contact mapping before this invoice can sync.';
  }

  if (issue.code === 'rate_limited') {
    return 'Xero is rate limiting invoice sync. Retry after a short wait.';
  }

  if (
    issue.nextAction === 'connect_xero' ||
    issue.nextAction === 'reconnect_xero' ||
    issue.code === 'connection_missing' ||
    issue.code === 'auth_failed' ||
    issue.code === 'forbidden'
  ) {
    return 'Xero connection needs attention before this invoice can sync.';
  }

  if (
    issue.nextAction === 'open_org_settings' ||
    issue.code === 'configuration_unavailable' ||
    issue.code === 'missing_revenue_accounts'
  ) {
    return 'Xero account settings need attention before this invoice can sync.';
  }

  if (issue.code === 'validation_failed') {
    return 'Invoice data needs review before this order can sync to Xero.';
  }

  return ORDER_XERO_ALERT_FALLBACK_MESSAGE;
}
