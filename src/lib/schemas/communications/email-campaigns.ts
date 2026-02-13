/**
 * Email Campaigns Schemas
 *
 * Validation schemas for email campaign server functions.
 *
 * @see DOM-COMMS-003b
 */
import { z } from 'zod'
import { filterSchema, flexibleJsonSchema } from '../_shared/patterns'

export const recipientCriteriaSchema = z.object({
  tags: z.array(z.string()).optional(),
  statuses: z.array(z.string()).optional(),
  customerTypes: z.array(z.string()).optional(),
  contactIds: z.array(z.string().uuid()).optional(),
  customerIds: z.array(z.string().uuid()).optional(),
  excludeContactIds: z.array(z.string().uuid()).optional(),
  customFilters: flexibleJsonSchema.optional(),
})

export const createCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  templateType: z.enum([
    'welcome',
    'follow_up',
    'quote',
    'order_confirmation',
    'shipping_notification',
    'reminder',
    'newsletter',
    'promotion',
    'announcement',
    'custom',
  ]),
  templateData: flexibleJsonSchema.optional(),
  recipientCriteria: recipientCriteriaSchema.optional(),
  scheduledAt: z.coerce.date().optional(),
})

export const updateCampaignSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  templateType: z
    .enum([
      'welcome',
      'follow_up',
      'quote',
      'order_confirmation',
      'shipping_notification',
      'reminder',
      'newsletter',
      'promotion',
      'announcement',
      'custom',
    ])
    .optional(),
  templateData: flexibleJsonSchema.optional(),
  recipientCriteria: recipientCriteriaSchema.optional(),
  scheduledAt: z.coerce.date().optional(),
})

// ============================================================================
// CAMPAIGN FILTERS (separate concern from query schema)
// ============================================================================

/**
 * Campaign filter schema - extends base filterSchema with campaign-specific filters
 * Separated from query schema per SCHEMA-TRACE.md separation of concerns
 */
export const campaignFilterSchema = filterSchema.extend({
  status: z
    .enum(['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled', 'failed'])
    .optional(),
  templateType: z.string().optional(),
})

// ============================================================================
// CAMPAIGN LIST QUERY (merges filter + pagination)
// ============================================================================

/**
 * Campaign list query schema - combines filter + pagination
 * Uses campaignFilterSchema (which includes dateFrom/dateTo from base filterSchema)
 */
export const getCampaignsSchema = campaignFilterSchema.extend({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
})

export const getCampaignByIdSchema = z.object({
  id: z.string().uuid(),
})

export const getCampaignRecipientsSchema = z.object({
  campaignId: z.string().uuid(),
  status: z
    .enum([
      'pending',
      'sent',
      'delivered',
      'opened',
      'clicked',
      'bounced',
      'failed',
      'unsubscribed',
    ])
    .optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
})

export const previewRecipientsSchema = z.object({
  recipientCriteria: recipientCriteriaSchema,
  sampleSize: z.number().min(1).max(10).default(5),
})

export const cancelCampaignSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().optional(),
})

export const sendCampaignSchema = z.object({
  id: z.string().uuid(),
})

export const pauseCampaignSchema = z.object({
  id: z.string().uuid(),
})

export const resumeCampaignSchema = z.object({
  id: z.string().uuid(),
})

export const duplicateCampaignSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
})

export const testSendCampaignSchema = z.object({
  campaignId: z.string().uuid(),
  testEmail: z.string().email(),
})

export const populateCampaignRecipientsSchema = z.object({
  campaignId: z.string().uuid(),
})

export const deleteCampaignSchema = z.object({
  id: z.string().uuid(),
})

// ============================================================================
// INPUT TYPES (from Zod schemas)
// ============================================================================

export type RecipientCriteriaInput = z.infer<typeof recipientCriteriaSchema>
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>
export type GetCampaignsInput = z.infer<typeof getCampaignsSchema>
export type CampaignFilter = z.infer<typeof campaignFilterSchema>
export type GetCampaignByIdInput = z.infer<typeof getCampaignByIdSchema>
export type GetCampaignRecipientsInput = z.infer<typeof getCampaignRecipientsSchema>
export type PreviewRecipientsInput = z.infer<typeof previewRecipientsSchema>
export type CancelCampaignInput = z.infer<typeof cancelCampaignSchema>
export type PopulateCampaignRecipientsInput = z.infer<
  typeof populateCampaignRecipientsSchema
>
export type DeleteCampaignInput = z.infer<typeof deleteCampaignSchema>
export type SendCampaignInput = z.infer<typeof sendCampaignSchema>
export type PauseCampaignInput = z.infer<typeof pauseCampaignSchema>
export type ResumeCampaignInput = z.infer<typeof resumeCampaignSchema>
export type DuplicateCampaignInput = z.infer<typeof duplicateCampaignSchema>
export type TestSendCampaignInput = z.infer<typeof testSendCampaignSchema>

// ============================================================================
// OUTPUT TYPES (from Drizzle schema - what server functions return)
// ============================================================================

import type { EmailCampaign } from '../../../../drizzle/schema/communications/email-campaigns'

/**
 * Campaign output type - matches what getCampaigns/getCampaignById returns
 * Server functions return EmailCampaign rows directly from Drizzle
 */
export type Campaign = EmailCampaign

/**
 * Campaign status type
 */
export type CampaignStatus = Campaign['status']

/**
 * Campaign list item - transformed for UI display
 * Used in CampaignsList component
 */
export interface CampaignListItem {
  id: string
  name: string
  templateType: string
  status: CampaignStatus
  recipientCount: number
  sentCount: number
  openCount: number
  clickCount: number
  bounceCount: number
  failedCount: number
  scheduledAt: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

/**
 * Campaign recipient - matches what getCampaignRecipients returns
 * Server function returns a subset of CampaignRecipient fields
 */
export interface CampaignRecipient {
  id: string
  email: string
  name: string | null
  contactId: string | null
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'unsubscribed'
  sentAt: Date | null
  openedAt: Date | null
  clickedAt: Date | null
  errorMessage: string | null
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

/**
 * Props for CampaignsList presenter component
 * All data is passed from the container route.
 */
export interface CampaignsListProps {
  /** @source useCampaigns() in container */
  campaigns: CampaignListItem[]
  /** @source useCampaigns().isLoading in container */
  isLoading: boolean
  /** @source useCancelCampaign handler in container */
  onCancel: (id: string) => Promise<void>
  /** @source useDeleteCampaign handler in container */
  onDelete: (id: string) => Promise<void>
  /** @source navigate handler in container */
  onView: (id: string) => void
  /** @source navigate handler in container */
  onCreate: () => void
  /** @source useDuplicateCampaign handler in container */
  onDuplicate?: (id: string) => Promise<void>
  /** @source useTestSendCampaign handler in container */
  onTestSend?: (campaignId: string, testEmail: string) => Promise<void>
  /** @source useCancelCampaign.isPending in container */
  isCancelling?: boolean
  /** @source useDeleteCampaign.isPending in container */
  isDeleting?: boolean
  /** @source useDuplicateCampaign.isPending in container */
  isDuplicating?: boolean
  /** @source useTestSendCampaign.isPending in container */
  isTestSending?: boolean
  /** Bulk action handlers */
  onBulkDelete?: (ids: string[]) => Promise<void>
  onBulkPause?: (ids: string[]) => Promise<void>
  onBulkResume?: (ids: string[]) => Promise<void>
  /** Bulk action loading states */
  isBulkDeleting?: boolean
  isBulkPausing?: boolean
  isBulkResuming?: boolean
  className?: string
}

/**
 * Props for CampaignDetailPanel component
 */
export interface CampaignDetailPanelProps {
  campaignId: string
  onBack?: () => void
  className?: string
}

/**
 * Wizard step type for campaign wizard
 */
export type WizardStep = "details" | "template" | "recipients" | "preview"

/**
 * Props for CampaignWizard component
 */
export interface CampaignWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (campaignId: string) => void
  initialCampaign?: Campaign // Campaign data for edit mode
}

/**
 * Campaign form data for wizard
 */
export interface CampaignFormData {
  name: string
  description: string
  templateType: string
  templateData?: Record<string, unknown>
  recipientCriteria?: RecipientCriteriaInput
  scheduledAt?: Date
}

/**
 * Preview recipient - matches what previewCampaignRecipients returns
 */
export interface PreviewRecipient {
  id: string
  email: string | null
  name: string | null
  customerId: string | null
}

/**
 * Preview recipients result - matches what previewCampaignRecipients returns
 */
export interface PreviewRecipientsResult {
  total: number
  sample: PreviewRecipient[]
}

/**
 * Props for CampaignPreviewPanel component
 */
export interface CampaignPreviewPanelProps {
  name: string
  templateType: string
  templateData?: Record<string, unknown>
  recipientCriteria: RecipientCriteriaInput
  scheduledAt?: Date | null
  onRecipientCountChange?: (count: number) => void
  className?: string
}
