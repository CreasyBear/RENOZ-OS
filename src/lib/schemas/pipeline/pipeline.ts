/**
 * Pipeline Zod Schemas
 *
 * Validation schemas for opportunities, activities, quotes, and win/loss reasons.
 * All monetary values are in AUD dollars (numeric(12,2)).
 *
 * @see drizzle/schema/pipeline.ts for database schema
 */

import { z } from 'zod';
import {
  percentageSchema,
  paginationSchema,
  filterSchema,
  idParamSchema,
  currencySchema,
} from '../_shared/patterns';

// ============================================================================
// ENUMS (must match canonical-enums.json)
// ============================================================================

export const opportunityStageValues = [
  'new',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
] as const;

export const opportunityActivityTypeValues = [
  'call',
  'email',
  'meeting',
  'note',
  'follow_up',
] as const;

export const winLossReasonTypeValues = ['win', 'loss'] as const;

export const quoteStatusValues = ['draft', 'sent', 'accepted', 'rejected', 'expired'] as const;

export const opportunityStageSchema = z.enum(opportunityStageValues);
export const opportunityActivityTypeSchema = z.enum(opportunityActivityTypeValues);
export const winLossReasonTypeSchema = z.enum(winLossReasonTypeValues);
export const quoteStatusSchema = z.enum(quoteStatusValues);

export type OpportunityStage = z.infer<typeof opportunityStageSchema>;
export type OpportunityActivityType = z.infer<typeof opportunityActivityTypeSchema>;
export type WinLossReasonType = z.infer<typeof winLossReasonTypeSchema>;
export type QuoteStatus = z.infer<typeof quoteStatusSchema>;

// Stage probability defaults (matching PRD)
export const STAGE_PROBABILITY_DEFAULTS: Record<OpportunityStage, number> = {
  new: 10,
  qualified: 30,
  proposal: 60,
  negotiation: 80,
  won: 100,
  lost: 0,
};

// ============================================================================
// OPPORTUNITY METADATA
// ============================================================================

export const opportunityMetadataSchema = z
  .object({
    source: z.enum(['referral', 'website', 'cold_call', 'trade_show', 'other']).optional(),
    notes: z.string().max(2000).optional(),
  })
  .passthrough();

export type OpportunityMetadata = z.infer<typeof opportunityMetadataSchema>;

// ============================================================================
// CREATE OPPORTUNITY
// ============================================================================

export const createOpportunitySchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(2000).optional(),
  customerId: z.string().uuid('Customer is required'),
  contactId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  stage: opportunityStageSchema.default('new'),
  probability: percentageSchema.optional(),
  value: currencySchema.default(0),
  expectedCloseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(), // YYYY-MM-DD format
  followUpDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(), // YYYY-MM-DD format
  metadata: opportunityMetadataSchema.default({}),
  tags: z.array(z.string().max(50)).max(20).default([]),
});

export type CreateOpportunity = z.infer<typeof createOpportunitySchema>;

// ============================================================================
// UPDATE OPPORTUNITY
// ============================================================================

export const updateOpportunitySchema = createOpportunitySchema.partial().extend({
  version: z.number().int().positive().optional(), // For optimistic locking
});

export type UpdateOpportunity = z.infer<typeof updateOpportunitySchema>;

// ============================================================================
// UPDATE OPPORTUNITY STAGE
// ============================================================================

export const updateOpportunityStageSchema = z.object({
  stage: opportunityStageSchema,
  probability: percentageSchema.optional(),
  winLossReasonId: z.string().uuid().optional(),
  lostNotes: z.string().max(2000).optional(),
  competitorName: z.string().max(100).optional(),
  version: z.number().int().positive().optional(), // For optimistic locking
});

export type UpdateOpportunityStage = z.infer<typeof updateOpportunityStageSchema>;

// ============================================================================
// OPPORTUNITY OUTPUT
// ============================================================================

export const opportunitySchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  customerId: z.string().uuid(),
  contactId: z.string().uuid().nullable(),
  assignedTo: z.string().uuid().nullable(),
  stage: opportunityStageSchema,
  probability: z.number().nullable(),
  value: currencySchema,
  weightedValue: currencySchema.nullable(),
  expectedCloseDate: z.coerce.date().nullable(), // Output: Date object from date column
  actualCloseDate: z.coerce.date().nullable(), // Output: Date object from date column
  followUpDate: z.coerce.date().nullable(), // Output: Date object from date column
  quoteExpiresAt: z.coerce.date().nullable(), // Output: Date object from timestamp column
  quotePdfUrl: z.string().nullable(),
  winLossReasonId: z.string().uuid().nullable(),
  lostReason: z.string().nullable(),
  lostNotes: z.string().nullable(),
  competitorName: z.string().nullable(),
  daysInStage: z.number(),
  version: z.number(),
  metadata: opportunityMetadataSchema.nullable(),
  tags: z.array(z.string()).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
  deletedAt: z.coerce.date().nullable(),
});

export type Opportunity = z.infer<typeof opportunitySchema>;

// ============================================================================
// OPPORTUNITY FILTERS
// ============================================================================

export const opportunityFilterSchema = filterSchema.extend({
  stage: opportunityStageSchema.optional(),
  stages: z.array(opportunityStageSchema).optional(), // Multiple stages
  customerId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  minValue: z.coerce.number().optional(),
  maxValue: z.coerce.number().optional(),
  minProbability: percentageSchema.optional(),
  maxProbability: percentageSchema.optional(),
  expectedCloseDateFrom: z.coerce.date().optional(),
  expectedCloseDateTo: z.coerce.date().optional(),
  includeWonLost: z.coerce.boolean().default(false), // By default exclude won/lost
});

export type OpportunityFilter = z.infer<typeof opportunityFilterSchema>;

// ============================================================================
// OPPORTUNITY LIST QUERY
// ============================================================================

export const opportunityListQuerySchema = paginationSchema.merge(opportunityFilterSchema);

export type OpportunityListQuery = z.infer<typeof opportunityListQuerySchema>;

// ============================================================================
// WIN/LOSS REASONS
// ============================================================================

export const createWinLossReasonSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: winLossReasonTypeSchema,
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative().default(0),
});

export type CreateWinLossReason = z.infer<typeof createWinLossReasonSchema>;

export const updateWinLossReasonSchema = createWinLossReasonSchema.partial().extend({
  version: z.number().int().positive().optional(),
});

export type UpdateWinLossReason = z.infer<typeof updateWinLossReasonSchema>;

export const winLossReasonSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string(),
  type: winLossReasonTypeSchema,
  description: z.string().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number(),
  version: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
});

export type WinLossReason = z.infer<typeof winLossReasonSchema>;

export const winLossReasonFilterSchema = z.object({
  type: winLossReasonTypeSchema.optional(),
  isActive: z.coerce.boolean().optional(),
});

export type WinLossReasonFilter = z.infer<typeof winLossReasonFilterSchema>;

// ============================================================================
// OPPORTUNITY ACTIVITIES
// ============================================================================

export const createOpportunityActivitySchema = z.object({
  opportunityId: z.string().uuid('Opportunity is required'),
  type: opportunityActivityTypeSchema,
  description: z.string().min(1, 'Description is required').max(2000),
  outcome: z.string().max(1000).optional(),
  scheduledAt: z.coerce.date().optional().nullable(),
  completedAt: z.coerce.date().optional().nullable(),
});

export type CreateOpportunityActivity = z.infer<typeof createOpportunityActivitySchema>;

export const opportunityActivitySchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  opportunityId: z.string().uuid(),
  type: opportunityActivityTypeSchema,
  description: z.string(),
  outcome: z.string().nullable(),
  scheduledAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  createdBy: z.string().uuid(),
  createdAt: z.coerce.date(),
});

export type OpportunityActivity = z.infer<typeof opportunityActivitySchema>;

export const opportunityActivityFilterSchema = z.object({
  opportunityId: z.string().uuid().optional(),
  type: opportunityActivityTypeSchema.optional(),
  scheduledFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD format
  scheduledTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD format
  completed: z.coerce.boolean().optional(), // true = completed, false = pending
});

export type OpportunityActivityFilter = z.infer<typeof opportunityActivityFilterSchema>;

// ============================================================================
// QUOTE LINE ITEM
// ============================================================================

export const quoteLineItemSchema = z.object({
  productId: z.string().uuid().optional(),
  sku: z.string().max(50).optional(),
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unitPrice: currencySchema, // Price in dollars
  discountPercent: percentageSchema.optional(),
  total: currencySchema, // Line total in dollars
});

export type QuoteLineItem = z.infer<typeof quoteLineItemSchema>;

// ============================================================================
// QUOTE VERSIONS
// ============================================================================

export const createQuoteVersionSchema = z.object({
  opportunityId: z.string().uuid('Opportunity is required'),
  items: z.array(quoteLineItemSchema).min(1, 'At least one line item required'),
  notes: z.string().max(2000).optional(),
});

export type CreateQuoteVersion = z.infer<typeof createQuoteVersionSchema>;

export const quoteVersionSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  opportunityId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
  items: z.array(quoteLineItemSchema),
  subtotal: currencySchema,
  taxAmount: currencySchema, // 10% GST
  total: currencySchema,
  notes: z.string().nullable(),
  version: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
});

export type QuoteVersion = z.infer<typeof quoteVersionSchema>;

export const quoteVersionFilterSchema = z.object({
  opportunityId: z.string().uuid(),
});

export type QuoteVersionFilter = z.infer<typeof quoteVersionFilterSchema>;

export const restoreQuoteVersionSchema = z.object({
  opportunityId: z.string().uuid('Opportunity is required'),
  sourceVersionId: z.string().uuid('Source version is required'),
  notes: z.string().max(2000).optional(),
});

export type RestoreQuoteVersion = z.infer<typeof restoreQuoteVersionSchema>;

export const updateQuoteExpirationSchema = z.object({
  opportunityId: z.string().uuid('Opportunity is required'),
  quoteExpiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format (for date column)
});

export type UpdateQuoteExpiration = z.infer<typeof updateQuoteExpirationSchema>;

export const sendQuoteSchema = z.object({
  opportunityId: z.string().uuid('Opportunity is required'),
  quoteVersionId: z.string().uuid('Quote version is required'),
  recipientEmail: z.string().email('Valid email required'),
  recipientName: z.string().min(1).max(100).optional(),
  subject: z.string().min(1).max(200).optional(),
  message: z.string().max(2000).optional(),
  ccEmails: z.array(z.string().email()).max(5).optional(),
});

export type SendQuote = z.infer<typeof sendQuoteSchema>;

// ============================================================================
// QUOTES (Legacy)
// ============================================================================

export const createQuoteSchema = z.object({
  quoteNumber: z.string().max(50).optional(),
  opportunityId: z.string().uuid().optional(),
  customerId: z.string().uuid('Customer is required'),
  status: quoteStatusSchema.default('draft'),
  quoteDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD format
  validUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD format
  lineItems: z.array(quoteLineItemSchema).default([]),
  terms: z.string().max(5000).optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateQuote = z.infer<typeof createQuoteSchema>;

export const updateQuoteSchema = createQuoteSchema.partial();

export type UpdateQuote = z.infer<typeof updateQuoteSchema>;

export const quoteSchema = createQuoteSchema.extend({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  subtotal: currencySchema,
  discountAmount: currencySchema,
  taxAmount: currencySchema,
  total: currencySchema,
  acceptedAt: z.coerce.date().nullable(), // Output: Date object from date column
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
  updatedBy: z.string().uuid().nullable(),
});

export type Quote = z.infer<typeof quoteSchema>;

export const quoteFilterSchema = filterSchema.extend({
  status: quoteStatusSchema.optional(),
  customerId: z.string().uuid().optional(),
  opportunityId: z.string().uuid().optional(),
});

export type QuoteFilter = z.infer<typeof quoteFilterSchema>;

export const quoteListQuerySchema = paginationSchema.merge(quoteFilterSchema);

export type QuoteListQuery = z.infer<typeof quoteListQuerySchema>;

// ============================================================================
// PIPELINE METRICS
// ============================================================================

export const pipelineMetricsSchema = z.object({
  totalValue: z.number(),
  weightedValue: z.number(),
  opportunityCount: z.number(),
  byStage: z.record(
    opportunityStageSchema,
    z.object({
      count: z.number(),
      value: z.number(),
      weightedValue: z.number(),
    })
  ),
  avgDaysInStage: z.record(opportunityStageSchema, z.number()),
  conversionRate: z.number(), // Percentage of won vs total closed
});

export type PipelineMetrics = z.infer<typeof pipelineMetricsSchema>;

export const pipelineMetricsQuerySchema = z.object({
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD format
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD format
  assignedTo: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
});

export type PipelineMetricsQuery = z.infer<typeof pipelineMetricsQuerySchema>;

// ============================================================================
// CONVERT TO ORDER
// ============================================================================

export const convertToOrderSchema = z.object({
  opportunityId: z.string().uuid('Opportunity is required'),
  quoteVersionId: z.string().uuid().optional(), // Which quote version to use
  overrideExpiredQuote: z.boolean().default(false), // Allow conversion of expired quotes
});

export type ConvertToOrder = z.infer<typeof convertToOrderSchema>;

// ============================================================================
// FORECASTING
// ============================================================================

export const forecastGroupByValues = ['month', 'quarter', 'week', 'rep', 'customer'] as const;
export const forecastGroupBySchema = z.enum(forecastGroupByValues);
export type ForecastGroupBy = z.infer<typeof forecastGroupBySchema>;

export const forecastQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  groupBy: forecastGroupBySchema.default('month'),
  includeWeighted: z.coerce.boolean().default(true),
  assignedTo: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  stages: z.array(opportunityStageSchema).optional(),
});

export type ForecastQuery = z.infer<typeof forecastQuerySchema>;

export const forecastPeriodSchema = z.object({
  period: z.string(), // "2026-01", "2026-Q1", "week-1", user name, or customer name
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  opportunityCount: z.number(),
  totalValue: z.number(),
  weightedValue: z.number(),
  wonValue: z.number(),
  lostValue: z.number(),
  avgProbability: z.number(),
});

export type ForecastPeriod = z.infer<typeof forecastPeriodSchema>;

export const velocityQuerySchema = z.object({
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD format
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // YYYY-MM-DD format
  stages: z.array(opportunityStageSchema).optional(),
});

export type VelocityQuery = z.infer<typeof velocityQuerySchema>;

export const velocityMetricsSchema = z.object({
  avgDealSize: z.number(),
  avgSalesCycle: z.number(), // Days from new to won
  avgTimeInStage: z.record(opportunityStageSchema, z.number()),
  winRate: z.number(), // Percentage
  lossRate: z.number(), // Percentage
  stageConversionRates: z.record(opportunityStageSchema, z.number()), // % that move to next stage
  pipelineVelocity: z.number(), // Value moved through pipeline per day
});

export type VelocityMetrics = z.infer<typeof velocityMetricsSchema>;

export const revenueAttributionQuerySchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  groupBy: z.enum(['rep', 'customer', 'source', 'month']).default('rep'),
});

export type RevenueAttributionQuery = z.infer<typeof revenueAttributionQuerySchema>;

export const revenueAttributionSchema = z.object({
  group: z.string(),
  groupId: z.string().optional(),
  wonCount: z.number(),
  wonValue: z.number(),
  lostCount: z.number(),
  lostValue: z.number(),
  pipelineCount: z.number(),
  pipelineValue: z.number(),
  conversionRate: z.number(),
});

export type RevenueAttribution = z.infer<typeof revenueAttributionSchema>;

// ============================================================================
// PARAMS
// ============================================================================

export const opportunityParamsSchema = idParamSchema;
export type OpportunityParams = z.infer<typeof opportunityParamsSchema>;

export const quoteParamsSchema = idParamSchema;
export type QuoteParams = z.infer<typeof quoteParamsSchema>;

export const winLossReasonParamsSchema = idParamSchema;
export type WinLossReasonParams = z.infer<typeof winLossReasonParamsSchema>;

export const opportunityActivityParamsSchema = idParamSchema;
export type OpportunityActivityParams = z.infer<typeof opportunityActivityParamsSchema>;

export const quoteVersionParamsSchema = idParamSchema;
export type QuoteVersionParams = z.infer<typeof quoteVersionParamsSchema>;
