/**
 * Communications Hooks
 *
 * Centralized hooks for communications domain data fetching.
 * Provides hooks for campaigns, templates, signatures, scheduled calls,
 * contact preferences, and quick logging.
 *
 * @example
 * ```tsx
 * import {
 *   useCustomerCommunications,
 *   useCampaigns,
 *   useTemplates,
 *   useSignatures,
 *   useScheduledCalls,
 *   useContactPreferences,
 *   useCreateQuickLog,
 * } from '@/hooks/communications';
 *
 * // Timeline
 * const { data: timeline } = useCustomerCommunications({ customerId });
 *
 * // Campaigns
 * const { data: campaigns } = useCampaigns({ status: 'draft' });
 *
 * // Templates
 * const { data: templates } = useTemplates({ category: 'marketing' });
 *
 * // Signatures
 * const { data: signatures } = useSignatures();
 *
 * // Scheduled Calls
 * const { data: calls } = useScheduledCalls({ customerId });
 *
 * // Contact Preferences
 * const { data: prefs } = useContactPreferences({ contactId });
 *
 * // Quick Log
 * const logMutation = useCreateQuickLog();
 * ```
 */

// Customer communications timeline
export * from './use-customer-communications';

// Campaigns (full CRUD - replaces legacy use-email-campaigns)
export * from './use-campaigns';

// Email templates
export * from './use-templates';

// Email signatures
export * from './use-signatures';

// Scheduled calls
export * from './use-scheduled-calls';

// Contact communication preferences
export * from './use-contact-preferences';

// Quick logging (calls, notes, meetings)
export * from './use-quick-log';

// Scheduled emails
export * from './use-scheduled-emails';

// Email suppression (Resend integration)
export * from './use-email-suppression';

// Email preview (Resend integration)
export * from './use-email-preview';
