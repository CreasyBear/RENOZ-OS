/**
 * Customer Triage Schemas
 *
 * Validation schemas for customer triage/alerts data.
 */

import { z } from 'zod';

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

/**
 * Input schema for getCustomerTriage server function
 */
export const getCustomerTriageInputSchema = z.object({
  /**
   * Maximum number of credit hold customers to return
   * @default 5
   */
  creditHoldLimit: z.coerce.number().int().min(1).max(50).default(5),

  /**
   * Maximum number of low health score customers to return
   * @default 3
   */
  lowHealthLimit: z.coerce.number().int().min(1).max(50).default(3),

  /**
   * Health score threshold (customers below this are considered "low health")
   * @default 50
   */
  healthScoreThreshold: z.coerce.number().int().min(0).max(100).default(50),
});

export type GetCustomerTriageInput = z.infer<typeof getCustomerTriageInputSchema>;

// ============================================================================
// OUTPUT TYPES
// ============================================================================

/**
 * Customer triage item (minimal data for triage display)
 */
export const customerTriageItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  healthScore: z.number().nullable(),
  creditHold: z.boolean(),
  creditHoldReason: z.string().nullable(),
});

export type CustomerTriageItem = z.infer<typeof customerTriageItemSchema>;

/**
 * Customer triage response
 */
export const customerTriageResponseSchema = z.object({
  creditHolds: z.array(customerTriageItemSchema),
  lowHealthScores: z.array(customerTriageItemSchema),
});

export type CustomerTriageResponse = z.infer<typeof customerTriageResponseSchema>;
