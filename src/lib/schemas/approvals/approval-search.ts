/**
 * Approval Search Schemas
 *
 * Zod schemas for approvals route search state.
 */
import { z } from 'zod';

export const approvalsSearchSchema = z.object({
  tab: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  type: z.enum(['all', 'purchase_order', 'amendment']).default('all'),
  priority: z.enum(['all', 'low', 'medium', 'high', 'urgent']).default('all'),
  search: z.string().optional(),
});

export type ApprovalsSearch = z.infer<typeof approvalsSearchSchema>;
