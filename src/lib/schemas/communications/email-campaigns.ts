/**
 * Email Campaigns Schemas
 *
 * Validation schemas for email campaign server functions.
 *
 * @see DOM-COMMS-003b
 */
import { z } from 'zod'

export const recipientCriteriaSchema = z.object({
  tags: z.array(z.string()).optional(),
  statuses: z.array(z.string()).optional(),
  customerTypes: z.array(z.string()).optional(),
  contactIds: z.array(z.string().uuid()).optional(),
  customerIds: z.array(z.string().uuid()).optional(),
  excludeContactIds: z.array(z.string().uuid()).optional(),
  customFilters: z.record(z.string(), z.unknown()).optional(),
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
  templateData: z.record(z.string(), z.unknown()).optional(),
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
  templateData: z.record(z.string(), z.unknown()).optional(),
  recipientCriteria: recipientCriteriaSchema.optional(),
  scheduledAt: z.coerce.date().optional(),
})

export const getCampaignsSchema = z.object({
  status: z
    .enum(['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled', 'failed'])
    .optional(),
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

export const populateCampaignRecipientsSchema = z.object({
  campaignId: z.string().uuid(),
})

export const deleteCampaignSchema = z.object({
  id: z.string().uuid(),
})

export type RecipientCriteriaInput = z.infer<typeof recipientCriteriaSchema>
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>
export type GetCampaignsInput = z.infer<typeof getCampaignsSchema>
export type GetCampaignByIdInput = z.infer<typeof getCampaignByIdSchema>
export type GetCampaignRecipientsInput = z.infer<typeof getCampaignRecipientsSchema>
export type PreviewRecipientsInput = z.infer<typeof previewRecipientsSchema>
export type CancelCampaignInput = z.infer<typeof cancelCampaignSchema>
export type PopulateCampaignRecipientsInput = z.infer<
  typeof populateCampaignRecipientsSchema
>
export type DeleteCampaignInput = z.infer<typeof deleteCampaignSchema>
