/**
 * Email History Zod Schemas
 *
 * Validation schemas for email history operations.
 */

import { z } from "zod";
import {
  idParamSchema,
  cursorPaginationSchema,
  emailSchema,
} from "./patterns";

// ============================================================================
// ENUMS
// ============================================================================

export const emailStatusValues = [
  "pending",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "failed",
] as const;

export const EmailStatusSchema = z.enum(emailStatusValues);
export type EmailStatus = z.infer<typeof EmailStatusSchema>;

// ============================================================================
// METADATA SCHEMAS
// ============================================================================

export const EmailAttachmentSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().int().nonnegative(),
  type: z.string().min(1).max(100),
});

export const EmailMetadataSchema = z
  .object({
    fromName: z.string().max(255).optional(),
    replyTo: z.string().email().optional(),
    cc: z.array(z.string().email()).optional(),
    bcc: z.array(z.string().email()).optional(),
    headers: z.record(z.string(), z.string()).optional(),
    attachments: z.array(EmailAttachmentSchema).optional(),
    providerMessageId: z.string().optional(),
    provider: z.string().max(50).optional(),
  })
  .passthrough();

export type EmailMetadata = z.infer<typeof EmailMetadataSchema>;

// ============================================================================
// CREATE SCHEMA (Append-only, no update)
// ============================================================================

export const CreateEmailHistorySchema = z.object({
  fromAddress: emailSchema,
  toAddress: emailSchema,
  subject: z.string().min(1, "Subject is required").max(998), // RFC 5321
  bodyHtml: z.string().max(1000000).optional(), // ~1MB limit
  bodyText: z.string().max(500000).optional(),
  customerId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  templateId: z.string().max(255).optional(),
  metadata: EmailMetadataSchema.optional(),
});

export type CreateEmailHistory = z.infer<typeof CreateEmailHistorySchema>;

// ============================================================================
// RESPONSE SCHEMA
// ============================================================================

export const EmailHistorySchema = CreateEmailHistorySchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  senderId: z.string().uuid().nullable(),
  status: EmailStatusSchema,
  openedAt: z.coerce.date().nullable(),
  clickedAt: z.coerce.date().nullable(),
  sentAt: z.coerce.date().nullable(),
  deliveredAt: z.coerce.date().nullable(),
  bouncedAt: z.coerce.date().nullable(),
  bounceReason: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export type EmailHistory = z.infer<typeof EmailHistorySchema>;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const EmailHistoryFilterSchema = z.object({
  status: EmailStatusSchema.optional(),
  customerId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  templateId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const EmailHistoryListQuerySchema = cursorPaginationSchema.merge(
  EmailHistoryFilterSchema
);

export type EmailHistoryListQuery = z.infer<typeof EmailHistoryListQuerySchema>;

// ============================================================================
// PARAMS SCHEMAS
// ============================================================================

export const EmailHistoryParamsSchema = idParamSchema;
export type EmailHistoryParams = z.infer<typeof EmailHistoryParamsSchema>;

// ============================================================================
// CAMPAIGN ANALYTICS
// ============================================================================

export const CampaignStatsSchema = z.object({
  campaignId: z.string().uuid(),
  totalSent: z.number().int().nonnegative(),
  delivered: z.number().int().nonnegative(),
  opened: z.number().int().nonnegative(),
  clicked: z.number().int().nonnegative(),
  bounced: z.number().int().nonnegative(),
  openRate: z.number().min(0).max(100),
  clickRate: z.number().min(0).max(100),
  bounceRate: z.number().min(0).max(100),
});

export type CampaignStats = z.infer<typeof CampaignStatsSchema>;
