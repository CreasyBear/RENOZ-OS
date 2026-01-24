/**
 * Revenue Recognition Zod Schemas
 *
 * Validation schemas for revenue recognition engine operations.
 * Supports milestone-based, on-delivery, and time-based recognition.
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json for DOM-FIN-008b
 */

import { z } from 'zod';
import { idSchema, paginationSchema, currencySchema } from '../_shared/patterns';

// ============================================================================
// RECOGNITION TYPE & STATE
// ============================================================================

export const recognitionTypeValues = ['on_delivery', 'milestone', 'time_based'] as const;

export const recognitionTypeSchema = z.enum(recognitionTypeValues);
export type RecognitionType = z.infer<typeof recognitionTypeSchema>;

export const recognitionStateValues = [
  'pending',
  'recognized',
  'syncing',
  'synced',
  'sync_failed',
  'manual_override',
] as const;

export const recognitionStateSchema = z.enum(recognitionStateValues);
export type RecognitionState = z.infer<typeof recognitionStateSchema>;

export const deferredRevenueStatusValues = [
  'deferred',
  'partially_recognized',
  'fully_recognized',
] as const;

export const deferredRevenueStatusSchema = z.enum(deferredRevenueStatusValues);
export type DeferredRevenueStatus = z.infer<typeof deferredRevenueStatusSchema>;

// ============================================================================
// RECOGNIZE REVENUE
// ============================================================================

/**
 * Parameters for recognizing revenue on an order.
 */
export const recognizeRevenueSchema = z.object({
  orderId: idSchema,
  recognitionType: recognitionTypeSchema,

  // For milestone recognition
  milestoneName: z.string().optional(),

  // Amount to recognize (AUD). If not provided, uses order total.
  amount: currencySchema.optional(),

  // Recognition date (defaults to now) - YYYY-MM-DD format
  recognitionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),

  // Notes
  notes: z.string().optional(),
});

export type RecognizeRevenueInput = z.infer<typeof recognizeRevenueSchema>;

// ============================================================================
// CREATE DEFERRED REVENUE
// ============================================================================

/**
 * Parameters for creating a deferred revenue record.
 * Used for 50% commercial deposits.
 */
export const createDeferredRevenueSchema = z.object({
  orderId: idSchema,

  // Deferred amount (AUD)
  amount: currencySchema,

  // Expected recognition date - YYYY-MM-DD format
  expectedRecognitionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),

  // Reason for deferral
  reason: z.string().optional(),
});

export type CreateDeferredRevenueInput = z.infer<typeof createDeferredRevenueSchema>;

// ============================================================================
// RELEASE DEFERRED REVENUE
// ============================================================================

/**
 * Parameters for releasing (recognizing) deferred revenue.
 */
export const releaseDeferredRevenueSchema = z.object({
  deferredRevenueId: idSchema,

  // Amount to release (AUD). If not provided, releases full remaining.
  amount: currencySchema.optional(),

  // Recognition date (defaults to now) - YYYY-MM-DD format
  recognitionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),

  // Milestone name for tracking
  milestoneName: z.string().optional(),
});

export type ReleaseDeferredRevenueInput = z.infer<typeof releaseDeferredRevenueSchema>;

// ============================================================================
// SYNC TO XERO
// ============================================================================

/**
 * Parameters for syncing recognition to Xero.
 */
export const syncRecognitionToXeroSchema = z.object({
  recognitionId: idSchema,
  // Force sync even if already synced
  force: z.boolean().default(false),
});

export type SyncRecognitionToXeroInput = z.infer<typeof syncRecognitionToXeroSchema>;

/**
 * Retry failed sync.
 */
export const retryRecognitionSyncSchema = z.object({
  recognitionId: idSchema,
});

export type RetryRecognitionSyncInput = z.infer<typeof retryRecognitionSyncSchema>;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Query for getting revenue recognition by order.
 */
export const getOrderRecognitionsSchema = z.object({
  orderId: idSchema,
});

export type GetOrderRecognitionsInput = z.infer<typeof getOrderRecognitionsSchema>;

/**
 * Query for getting deferred revenue by order.
 */
export const getOrderDeferredRevenueSchema = z.object({
  orderId: idSchema,
});

export type GetOrderDeferredRevenueInput = z.infer<typeof getOrderDeferredRevenueSchema>;

/**
 * Query for listing recognitions by state.
 */
export const listRecognitionsByStateSchema = paginationSchema.extend({
  state: recognitionStateSchema.optional(),
  // Date range
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type ListRecognitionsByStateInput = z.infer<typeof listRecognitionsByStateSchema>;

/**
 * Query for getting recognition summary by period.
 */
export const getRecognitionSummarySchema = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
  groupBy: z.enum(['day', 'week', 'month', 'quarter']).default('month'),
});

export type GetRecognitionSummaryInput = z.infer<typeof getRecognitionSummarySchema>;

/**
 * Query for getting deferred revenue balance.
 */
export const getDeferredRevenueBalanceSchema = z.object({
  asOfDate: z.coerce.date().optional(), // Defaults to now
});

export type GetDeferredRevenueBalanceInput = z.infer<typeof getDeferredRevenueBalanceSchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Revenue recognition record.
 */
export interface RevenueRecognitionRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  recognitionType: RecognitionType;
  milestoneName: string | null;
  recognizedAmount: number; // AUD cents
  recognitionDate: Date;
  state: RecognitionState;
  xeroSyncAttempts: number;
  xeroSyncError: string | null;
  lastXeroSyncAt: Date | null;
  xeroJournalId: string | null;
  notes: string | null;
  createdAt: Date;
}

/**
 * Deferred revenue record.
 */
export interface DeferredRevenueRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  originalAmount: number;
  remainingAmount: number;
  recognizedAmount: number;
  deferralDate: Date;
  expectedRecognitionDate: Date | null;
  status: DeferredRevenueStatus;
  reason: string | null;
  createdAt: Date;
}

/**
 * Recognition summary by period.
 */
export interface RecognitionSummary {
  period: string;
  periodLabel: string;
  totalRecognized: number;
  onDeliveryAmount: number;
  milestoneAmount: number;
  timeBasedAmount: number;
  recordCount: number;
}

/**
 * Deferred revenue balance summary.
 */
export interface DeferredRevenueBalance {
  totalDeferred: number;
  totalRecognized: number;
  totalRemaining: number;
  recordCount: number;
  byStatus: {
    deferred: number;
    partiallyRecognized: number;
    fullyRecognized: number;
  };
}
