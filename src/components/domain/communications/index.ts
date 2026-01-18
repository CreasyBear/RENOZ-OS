/**
 * Communications Domain Components
 *
 * Components for email tracking, communication analytics, scheduling, campaigns, and template management.
 */

// Email Tracking
export { EmailTrackingBadge, type EmailTrackingData, type EmailTrackingBadgeProps } from './email-tracking-badge'
export { EmailTrackingTimeline, type TrackingEvent, type EmailTrackingTimelineProps } from './email-tracking-timeline'
export { TemplateStatsCard, type TemplateStats, type LinkStats, type TemplateStatsCardProps } from './template-stats-card'

// Email Scheduling
export { DateTimePicker, type DateTimePickerProps } from './date-time-picker'
export { TimezoneSelect, getLocalTimezone, formatInTimezone, type TimezoneSelectProps } from './timezone-select'
export { ScheduledEmailBadge, ScheduledEmailDot, type ScheduledEmailStatus, type ScheduledEmailBadgeProps } from './scheduled-email-badge'
export { ScheduledEmailsList, ScheduledEmailsSkeleton, type ScheduledEmailsListProps } from './scheduled-emails-list'
export { ScheduleEmailDialog, type ScheduleEmailDialogProps } from './schedule-email-dialog'

// Email Campaigns
export { CampaignStatusBadge, CampaignStatusDot, type CampaignStatus, type CampaignStatusBadgeProps } from './campaign-status-badge'
export { CampaignsList, CampaignsListSkeleton, type CampaignsListProps, type CampaignListItem } from './campaigns-list'
export { CampaignDetailPanel, CampaignDetailSkeleton, type CampaignDetailPanelProps } from './campaign-detail-panel'
export { RecipientFilterBuilder, type RecipientCriteria, type RecipientFilterBuilderProps } from './recipient-filter-builder'
export { CampaignPreviewPanel, type CampaignPreviewPanelProps } from './campaign-preview-panel'
export { CampaignWizard, type CampaignWizardProps } from './campaign-wizard'

// Scheduled Calls
export { ScheduledCallBadge, type ScheduledCallStatus } from './scheduled-call-badge'
export { ScheduleCallDialog } from './schedule-call-dialog'
export { CallOutcomeDialog } from './call-outcome-dialog'
export { ScheduledCallActionMenu } from './scheduled-call-action-menu'
export { UpcomingCallsWidget } from './upcoming-calls-widget'
export { ScheduledCallsList } from './scheduled-calls-list'

// Communication Preferences
export { CommunicationPreferences, PreferenceHistory } from './communication-preferences'

// Email Signatures
export { SignatureEditor } from './signature-editor'
export { SignatureSelector } from './signature-selector'
export { SignaturesList } from './signatures-list'

// Email Templates
export { TemplateEditor } from './template-editor'
export { TemplateVariableMenu } from './template-variable-menu'
export { TemplatesList } from './templates-list'

// Quick Log (COMMS-AUTO-003)
export { QuickLogDialog, QuickLogButton, useQuickLogShortcut, type LogType } from './quick-log-dialog'
