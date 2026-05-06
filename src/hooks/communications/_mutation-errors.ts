import { getUserFriendlyMessage } from '@/lib/error-handling';

const TEMPLATE_FALLBACKS = {
  save: 'Unable to save communication template.',
  delete: 'Unable to delete communication template.',
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

export type CommunicationTemplateMutationAction = keyof typeof TEMPLATE_FALLBACKS;
export type CommunicationCampaignMutationAction = keyof typeof CAMPAIGN_FALLBACKS;

function isUnsafeMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('duplicate key') ||
    normalized.includes('violates') ||
    normalized.includes('constraint') ||
    normalized.includes('postgres') ||
    normalized.includes('supabase') ||
    normalized.includes('database') ||
    normalized.includes('stack') ||
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
