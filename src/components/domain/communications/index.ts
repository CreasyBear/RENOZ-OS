/**
 * Communications Domain Components
 *
 * Components for email tracking, communication analytics, scheduling, campaigns, and template management.
 */

// --- Core Components ---
export { DateTimePicker, type DateTimePickerProps } from './date-time-picker';
export { TimezoneSelect, getLocalTimezone, formatInTimezone, type TimezoneSelectProps } from './timezone-select';
export { CommunicationPreferences, PreferenceHistory } from './communication-preferences';
export { QuickLogDialog, QuickLogButton, useQuickLogShortcut } from './quick-log-dialog';
export type { LogType } from '@/lib/schemas/communications';

// --- Email Templates ---
export { TemplateEditor } from './template-editor';
export { TemplateVariableMenu } from './template-variable-menu';
export { TemplateStatsCard, type TemplateStats, type LinkStats, type TemplateStatsCardProps } from './template-stats-card';
export { TemplatesList, type TemplatesListProps, type Template, type TemplateFormValues, type TemplateVersion } from './templates-list';

// --- Campaigns ---
export * from './campaigns';
export { CommunicationsErrorBoundary } from './communications-error-boundary';
export { CampaignStatusDot, type CampaignStatus } from './campaigns/campaign-status-badge';
export type { CampaignStatusBadgeProps } from './campaigns/campaign-status-badge';
export { CampaignsListSkeleton, type CampaignsListProps, type CampaignListItem } from './campaigns/campaigns-list';
export { CampaignDetailSkeleton } from './campaigns/campaign-detail-panel';
export type { CampaignDetailPanelProps } from '@/lib/schemas/communications';
export type { RecipientCriteria, RecipientFilterBuilderProps } from './campaigns/recipient-filter-builder';
export type { CampaignPreviewPanelProps } from './campaigns/campaign-preview-panel';
export type { CampaignWizardProps } from '@/lib/schemas/communications';

// --- Calls ---
export * from './calls';
export type { ScheduledCallStatus } from './calls/scheduled-call-badge';
export type { ScheduledCallsListProps, ScheduledCall } from './calls/scheduled-calls-list';

// --- Emails ---
export * from './emails';
export type { EmailTrackingData, EmailTrackingBadgeProps } from './emails/email-tracking-badge';
export type { TrackingEvent, EmailTrackingTimelineProps } from './emails/email-tracking-timeline';
export { ScheduledEmailDot, type ScheduledEmailStatus } from './emails/scheduled-email-badge';
export type { ScheduledEmailBadgeProps } from './emails/scheduled-email-badge';
export { ScheduledEmailsSkeleton, type ScheduledEmailsListProps } from './emails/scheduled-emails-list';
export type { ScheduleEmailDialogProps } from './emails/schedule-email-dialog';

// --- Inbox ---
export * from './inbox';
export type { InboxListProps, InboxDetailProps, InboxEmailItem } from '@/lib/schemas/communications/inbox';

// --- Signatures ---
export * from './signatures';

// --- Templates (Resend Integration) ---
export * from './templates';

// --- Email Settings (Resend Integration) ---
export * from './settings';
