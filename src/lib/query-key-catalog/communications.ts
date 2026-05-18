type CampaignPreviewInput = {
  recipientCriteria: unknown
  sampleSize?: number
}

const all = ['communications'] as const;

const campaigns = () => [...all, 'campaigns'] as const;
const campaignsList = (filters?: Record<string, unknown>) =>
  [...campaigns(), 'list', filters ?? {}] as const;
const campaignDetail = (id: string) =>
  [...campaigns(), 'detail', id] as const;
const campaignRecipients = (campaignId: string, filters?: Record<string, unknown>) =>
  [...campaigns(), 'recipients', campaignId, filters ?? {}] as const;
const campaignPreview = (input: CampaignPreviewInput) =>
  [...campaigns(), 'preview', input] as const;

const templates = () => [...all, 'templates'] as const;
const templatesList = (filters?: Record<string, unknown>) =>
  [...templates(), 'list', filters ?? {}] as const;
const templateDetail = (id: string) =>
  [...templates(), 'detail', id] as const;
const templateVersions = (templateId: string) =>
  [...templates(), 'versions', templateId] as const;

const signatures = () => [...all, 'signatures'] as const;
const signaturesList = (filters?: Record<string, unknown>) =>
  [...signatures(), 'list', filters ?? {}] as const;
const signatureDetail = (id: string) =>
  [...signatures(), 'detail', id] as const;

const scheduledEmails = () => [...all, 'scheduledEmails'] as const;
const scheduledEmailsList = (filters?: Record<string, unknown>) =>
  [...scheduledEmails(), 'list', filters ?? {}] as const;
const scheduledEmailDetail = (id: string) =>
  [...scheduledEmails(), 'detail', id] as const;

const scheduledCalls = () => [...all, 'scheduledCalls'] as const;
const scheduledCallsList = (filters?: Record<string, unknown>) =>
  [...scheduledCalls(), 'list', filters ?? {}] as const;
const scheduledCallDetail = (id: string) =>
  [...scheduledCalls(), 'detail', id] as const;
const upcomingCalls = (filters?: Record<string, unknown>) =>
  [...scheduledCalls(), 'upcoming', filters ?? {}] as const;

const contactPreference = (contactId: string) =>
  [...all, 'contactPreference', contactId] as const;
const preferenceHistory = (contactId: string, filters?: Record<string, unknown>) =>
  [...all, 'preferenceHistory', contactId, filters ?? {}] as const;

const customerCommunications = (customerId: string) =>
  [...all, 'customer', customerId] as const;

const emailHistory = () => [...all, 'emailHistory'] as const;
const emailHistoryList = (filters?: Record<string, unknown>) =>
  [...emailHistory(), 'list', filters ?? {}] as const;

const inbox = () => [...all, 'inbox'] as const;
const inboxList = (filters?: Record<string, unknown>) =>
  [...inbox(), 'list', filters ?? {}] as const;
const inboxEmailAccounts = () => [...all, 'inbox-email-accounts'] as const;

const emailSuppressionAll = () => [...all, 'emailSuppression'] as const;
const emailSuppression = {
  all: emailSuppressionAll,
  lists: () => [...all, 'emailSuppression', 'list'] as const,
  list: (filters?: Record<string, unknown>) =>
    [...all, 'emailSuppression', 'list', filters ?? {}] as const,
  check: (email: string) =>
    [...all, 'emailSuppression', 'check', email] as const,
};

const emailAnalytics = {
  all: () => [...all, 'emailAnalytics'] as const,
  metrics: (filters?: Record<string, unknown>) =>
    [...all, 'emailAnalytics', 'metrics', filters ?? {}] as const,
};

const domainVerification = {
  all: () => [...all, 'domainVerification'] as const,
  status: () =>
    [...all, 'domainVerification', 'status'] as const,
};

const emailPreview = {
  all: () => [...all, 'emailPreview'] as const,
  render: (templateId: string, data?: Record<string, unknown>) =>
    [...all, 'emailPreview', 'render', templateId, data ?? {}] as const,
};

export const communicationsQueryKeys = {
  all,
  campaigns,
  campaignsList,
  campaignDetail,
  campaignRecipients,
  campaignPreview,
  templates,
  templatesList,
  templateDetail,
  templateVersions,
  signatures,
  signaturesList,
  signatureDetail,
  scheduledEmails,
  scheduledEmailsList,
  scheduledEmailDetail,
  scheduledCalls,
  scheduledCallsList,
  scheduledCallDetail,
  upcomingCalls,
  contactPreference,
  preferenceHistory,
  customerCommunications,
  emailHistory,
  emailHistoryList,
  inbox,
  inboxList,
  inboxEmailAccounts,
  emailSuppression,
  emailAnalytics,
  domainVerification,
  emailPreview,
};
