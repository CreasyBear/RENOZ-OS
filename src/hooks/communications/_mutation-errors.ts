import { getUserFriendlyMessage } from '@/lib/error-handling';

const TEMPLATE_FALLBACKS = {
  create: 'Unable to create communication template.',
  save: 'Unable to save communication template.',
  update: 'Unable to update communication template.',
  delete: 'Unable to delete communication template.',
  clone: 'Unable to clone communication template.',
  restore: 'Unable to restore communication template version.',
} as const;

const CAMPAIGN_FALLBACKS = {
  create: 'Unable to create communication campaign.',
  cancel: 'Unable to cancel communication campaign.',
  delete: 'Unable to delete communication campaign.',
  duplicate: 'Unable to duplicate communication campaign.',
  testSend: 'Unable to send communication campaign test email.',
  pause: 'Unable to pause communication campaign.',
  resume: 'Unable to resume communication campaign.',
} as const;

const INBOX_FALLBACKS = {
  markRead: 'Unable to mark email as read.',
  markAllRead: 'Unable to mark emails as read.',
  toggleStarred: 'Unable to update email star status.',
  archive: 'Unable to archive email.',
  delete: 'Unable to delete email.',
} as const;

const INBOX_ACCOUNT_FALLBACKS = {
  connect: 'Unable to start email account connection.',
  callback: 'Unable to connect email account.',
  providerCallback: 'Email account connection was not completed. Please try again.',
  sync: 'Unable to sync email account.',
  delete: 'Unable to disconnect email account.',
} as const;

const SCHEDULED_EMAIL_FALLBACKS = {
  schedule: 'Unable to schedule email.',
  update: 'Unable to update scheduled email.',
  cancel: 'Unable to cancel scheduled email.',
} as const;

const SCHEDULED_CALL_FALLBACKS = {
  schedule: 'Unable to schedule call.',
  complete: 'Unable to complete scheduled call.',
  outcome: 'Unable to log call outcome.',
  cancel: 'Unable to cancel scheduled call.',
  reschedule: 'Unable to reschedule call.',
  snooze: 'Unable to snooze call.',
} as const;

const SIGNATURE_FALLBACKS = {
  create: 'Unable to create email signature.',
  update: 'Unable to update email signature.',
  delete: 'Unable to delete email signature.',
  setDefault: 'Unable to set default email signature.',
} as const;

export type CommunicationTemplateMutationAction = keyof typeof TEMPLATE_FALLBACKS;
export type CommunicationCampaignMutationAction = keyof typeof CAMPAIGN_FALLBACKS;
export type CommunicationInboxMutationAction = keyof typeof INBOX_FALLBACKS;
export type CommunicationInboxAccountMutationAction = keyof typeof INBOX_ACCOUNT_FALLBACKS;
export type CommunicationScheduledEmailMutationAction = keyof typeof SCHEDULED_EMAIL_FALLBACKS;
export type CommunicationScheduledCallMutationAction = keyof typeof SCHEDULED_CALL_FALLBACKS;
export type CommunicationSignatureMutationAction = keyof typeof SIGNATURE_FALLBACKS;

function isUnsafeMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('access_denied') ||
    normalized.includes('api key') ||
    normalized.includes('authorization code') ||
    normalized.includes('client id') ||
    normalized.includes('client_secret') ||
    normalized.includes('duplicate key') ||
    normalized.includes('invalid_client') ||
    normalized.includes('invalid_grant') ||
    normalized.includes('oauth') ||
    normalized.includes('redirect_uri') ||
    normalized.includes('violates') ||
    normalized.includes('constraint') ||
    normalized.includes('postgres') ||
    normalized.includes('resend') ||
    normalized.includes('supabase') ||
    normalized.includes('database') ||
    normalized.includes('stack') ||
    normalized.includes('token') ||
    normalized.includes('internal server error')
  );
}

export function formatCommunicationMutationError(error: unknown, fallback: string): string {
  const message = getUserFriendlyMessage(error);
  if (!message || isUnsafeMessage(message)) return fallback;
  return message;
}

export function formatCommunicationTemplateMutationError(
  error: unknown,
  action: CommunicationTemplateMutationAction
): string {
  return formatCommunicationMutationError(error, TEMPLATE_FALLBACKS[action]);
}

export function formatCommunicationCampaignMutationError(
  error: unknown,
  action: CommunicationCampaignMutationAction
): string {
  return formatCommunicationMutationError(error, CAMPAIGN_FALLBACKS[action]);
}

export function formatCommunicationInboxMutationError(
  error: unknown,
  action: CommunicationInboxMutationAction
): string {
  return formatCommunicationMutationError(error, INBOX_FALLBACKS[action]);
}

export function formatCommunicationInboxAccountMutationError(
  error: unknown,
  action: CommunicationInboxAccountMutationAction
): string {
  return formatCommunicationMutationError(error, INBOX_ACCOUNT_FALLBACKS[action]);
}

export function formatCommunicationScheduledEmailMutationError(
  error: unknown,
  action: CommunicationScheduledEmailMutationAction
): string {
  return formatCommunicationMutationError(error, SCHEDULED_EMAIL_FALLBACKS[action]);
}

export function formatCommunicationScheduledCallMutationError(
  error: unknown,
  action: CommunicationScheduledCallMutationAction
): string {
  return formatCommunicationMutationError(error, SCHEDULED_CALL_FALLBACKS[action]);
}

export function formatCommunicationSignatureMutationError(
  error: unknown,
  action: CommunicationSignatureMutationAction
): string {
  return formatCommunicationMutationError(error, SIGNATURE_FALLBACKS[action]);
}
