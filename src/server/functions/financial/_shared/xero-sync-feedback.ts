import type { XeroSyncIssue } from '@/lib/schemas/settings/xero-sync';

export function formatXeroSyncIssueMessage(code: string): string {
  switch (code) {
    case 'connection_missing':
      return 'Connect Xero before syncing invoices and journals.';
    case 'configuration_unavailable':
      return 'Xero setup is incomplete. Review integration settings before syncing.';
    case 'auth_failed':
      return 'Xero connection needs attention before invoices and journals can sync.';
    case 'missing_contact_mapping':
      return 'Customer needs a trusted Xero contact mapping before this invoice can sync.';
    case 'rate_limited':
      return 'Xero is rate limiting sync requests. Wait before retrying this invoice.';
    case 'forbidden':
      return 'Reconnect Xero with the accounting organization and permissions needed for invoice sync.';
    case 'missing_revenue_accounts':
      return 'Xero account settings need attention before this invoice can sync.';
    case 'validation_failed':
      return 'Invoice data needs review before this order can sync to Xero.';
    default:
      return 'Xero sync is temporarily unavailable. Review the invoice and try again.';
  }
}

export function formatXeroSyncReadError(
  xeroSyncError?: string | null,
  issue?: XeroSyncIssue | null,
): string | null {
  if (!xeroSyncError) {
    return null;
  }

  if (issue?.code && issue.code !== 'reconciled_remote_exists') {
    return issue.message;
  }

  return formatXeroSyncIssueMessage('validation_failed');
}

export function formatXeroInvoiceSyncMutationError(xeroSyncError?: string | null): string {
  if (!xeroSyncError) {
    return 'Invoice sync is temporarily unavailable. Review the invoice and try again.';
  }

  const normalized = xeroSyncError.toLowerCase();

  if (
    normalized.includes('no active xero') ||
    normalized.includes('oauth is not configured') ||
    normalized.includes('xero integration unavailable') ||
    normalized.includes('auth') ||
    normalized.includes('expired') ||
    normalized.includes('refresh token') ||
    normalized.includes('refresh_token') ||
    normalized.includes('access token') ||
    normalized.includes('access_token') ||
    normalized.includes('unauthor')
  ) {
    return 'Xero connection needs attention before invoices can sync.';
  }

  if (
    normalized.includes('trusted xero contact mapping') ||
    (normalized.includes('missing') && normalized.includes('xero contact'))
  ) {
    return formatXeroSyncIssueMessage('missing_contact_mapping');
  }

  if (
    normalized.includes('forbidden') ||
    normalized.includes('tenant') ||
    normalized.includes('scope') ||
    normalized.includes('permission')
  ) {
    return formatXeroSyncIssueMessage('forbidden');
  }

  if (
    normalized.includes('rate limit') ||
    normalized.includes('too many requests') ||
    normalized.includes('retry after')
  ) {
    return formatXeroSyncIssueMessage('rate_limited');
  }

  return 'Invoice sync is temporarily unavailable. Review the invoice and try again.';
}

export function formatXeroPaymentWebhookError(
  error?: string | null,
  resultState?: string | null,
  retryable?: boolean,
): string {
  const normalized = error?.toLowerCase() ?? '';

  if (
    normalized.includes('not be loaded') ||
    normalized.includes('rate limit') ||
    normalized.includes('too many requests') ||
    retryable
  ) {
    return 'Xero payment processing is temporarily unavailable. Xero should retry this event.';
  }

  if (
    normalized.includes('tenant') ||
    normalized.includes('no active xero') ||
    normalized.includes('multiple active xero') ||
    normalized.includes('connection')
  ) {
    return 'Xero payment webhook could not be matched to an active accounting connection.';
  }

  if (resultState === 'unknown_invoice' || normalized.includes('invoice')) {
    return 'No local order matched this Xero invoice. The payment was not applied.';
  }

  if (resultState === 'rejected') {
    return 'The Xero payment could not be safely applied. Review the payment event audit.';
  }

  return 'Xero payment processing is temporarily unavailable. Review the payment event audit.';
}

export function formatRevenueRecognitionXeroSyncError(
  xeroSyncError?: string | null,
  state?: string | null,
): string | null {
  if (!xeroSyncError) {
    return null;
  }

  if (state === 'manual_override') {
    return 'Revenue recognition needs manual accounting review before another Xero sync attempt.';
  }

  const normalized = xeroSyncError.toLowerCase();

  if (normalized.includes('revenue recognition accounts')) {
    return 'Xero revenue recognition account settings need attention before journals can sync.';
  }

  if (
    normalized.includes('no active xero') ||
    normalized.includes('oauth is not configured') ||
    normalized.includes('xero integration unavailable')
  ) {
    return 'Xero connection needs attention before revenue journals can sync.';
  }

  if (
    normalized.includes('auth') ||
    normalized.includes('expired') ||
    normalized.includes('refresh token') ||
    normalized.includes('refresh_token') ||
    normalized.includes('access token') ||
    normalized.includes('access_token') ||
    normalized.includes('unauthor')
  ) {
    return 'Xero connection needs attention before revenue journals can sync.';
  }

  if (
    normalized.includes('forbidden') ||
    normalized.includes('tenant') ||
    normalized.includes('scope') ||
    normalized.includes('permission')
  ) {
    return 'Reconnect Xero with the accounting organization and permissions needed for journal sync.';
  }

  if (
    normalized.includes('rate limit') ||
    normalized.includes('too many requests') ||
    normalized.includes('retry after')
  ) {
    return 'Xero is rate limiting journal sync requests. Wait before retrying this recognition.';
  }

  return 'Revenue recognition journal sync is temporarily unavailable. Review the record and try again.';
}
