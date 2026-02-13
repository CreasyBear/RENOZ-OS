/**
 * Expiring Warranties Report Schemas
 *
 * URL search params and types for expiring warranties report.
 */

import { z } from 'zod';

// ============================================================================
// URL SEARCH SCHEMA
// ============================================================================

export const expiringWarrantiesSearchSchema = z.object({
  range: z.enum(['7', '30', '60', '90']).default('30'),
  customer: z.string().optional(),
  product: z.string().optional(),
  status: z.enum(['active', 'expired', 'all']).default('active'),
  sort: z
    .enum(['expiry_asc', 'expiry_desc', 'customer', 'product'])
    .default('expiry_asc'),
  page: z.coerce.number().min(1).default(1),
});

export type ExpiringWarrantiesSearchParams = z.infer<typeof expiringWarrantiesSearchSchema>;

/** Props for ExpiringWarrantiesReportPage */
export interface ExpiringWarrantiesReportPageProps {
  search: ExpiringWarrantiesSearchParams;
  onUpdateSearch: (nextSearch: ExpiringWarrantiesSearchParams) => void;
}
