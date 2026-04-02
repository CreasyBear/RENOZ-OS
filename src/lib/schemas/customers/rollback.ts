/**
 * Rollback Validation Schemas
 *
 * Zod schemas for bulk operation rollback.
 */

import { z } from 'zod';
import { normalizeObjectInput } from '../_shared/patterns';

// ============================================================================
// LIST RECENT BULK OPERATIONS SCHEMA
// ============================================================================

export const listRecentBulkOperationsSchema = normalizeObjectInput(
  z.object({
    entityType: z.string().optional(),
    limit: z.number().int().positive().max(50).default(10),
    hours: z.number().int().positive().max(168).default(24), // Max 7 days
  })
);

export type ListRecentBulkOperationsInput = z.infer<typeof listRecentBulkOperationsSchema>;

// ============================================================================
// ROLLBACK OPERATION SCHEMA
// ============================================================================

export const rollbackBulkOperationSchema = z.object({
  auditLogId: z.string().uuid(),
});

export type RollbackBulkOperationInput = z.infer<typeof rollbackBulkOperationSchema>;
