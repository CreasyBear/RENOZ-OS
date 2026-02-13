/**
 * Communications Schemas
 *
 * Provides validation schemas for communications operations.
 */

// --- Email History & Events ---
export * from './email-history';
export * from './email-events';
export * from './email-preview';
export * from './email-analytics';

// --- Email Management ---
export * from './email-suppression';
export * from './email-domain';
export * from './email-signatures';
export * from './email-templates';
export * from './scheduled-emails';
export * from './email-campaigns';
export * from './inbox';
export * from './inbox-accounts';

// --- Other Communications ---
export * from './notifications';
export * from './quick-log';
export * from './scheduled-calls';
export * from './communication-preferences';

// --- Component Inputs ---
export * from './component-inputs';

// --- Re-export key types for convenience ---
export type {
  // Input types
  ScheduleEmailInput,
  UpdateScheduledEmailInput,
  ScheduledEmailsSearch,
  // Output types
  ScheduledEmail,
  ScheduledEmailStatus,
  TemplateType,
  ScheduledEmailTemplateData,
  ScheduledEmailsListProps,
  ScheduleEmailDialogProps,
} from './scheduled-emails';

export type {
  // Output types
  Template,
  TemplateVersion,
  TemplateFormValues,
  TemplatesListProps,
  TemplateCategory,
  TemplateEditorProps,
  TemplateVariableMenuProps,
} from './email-templates';

export type {
  // Output types
  Campaign,
  CampaignStatus,
  CampaignListItem,
  CampaignRecipient,
  CampaignsListProps,
  CampaignDetailPanelProps,
  WizardStep,
  CampaignWizardProps,
  CampaignFormData,
  PreviewRecipient,
  PreviewRecipientsResult,
  CampaignPreviewPanelProps,
} from './email-campaigns';

export type {
  // Output types
  ScheduledCall,
  ScheduledCallStatus,
  ListScheduledCallsResult,
  ScheduledCallsListProps,
  UpcomingCallsWidgetProps,
  CallItemProps,
  // Form values
  ScheduleCallFormValues,
  CallOutcomeFormValues,
  // Component props
  ScheduleCallDialogProps,
  CallOutcomeDialogProps,
  ScheduledCallActionMenuProps,
} from './scheduled-calls';

export type {
  // Output types
  Signature,
  SignatureFormValues,
  SignaturesListProps,
  SignatureEditorProps,
  SignatureSelectorProps,
} from './email-signatures';

export type {
  // Output types
  EmailHistoryItem,
  EmailHistoryListItem,
  EmailHistoryListProps,
} from './email-history';

export type {
  // Output types
  ContactPreferences,
  PreferenceHistoryItem,
  PreferenceHistoryResponse,
  // Component props
  CommunicationPreferencesProps,
  PreferenceHistoryProps,
} from './communication-preferences';

export type {
  // Types
  LogType,
  QuickLogFormValues,
  // Component props
  QuickLogDialogProps,
  QuickLogDialogPresenterProps,
  QuickLogButtonProps,
} from './quick-log';
