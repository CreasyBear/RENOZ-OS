'use client';

/**
 * Invoice Summary Hook
 *
 * TanStack Query hook for invoice summary/aggregate data.
 * Used by dashboard widgets to show invoice metrics.
 *
 * @see docs/design-system/INVOICE-STANDARDS.md
 */

import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import type { InvoiceSummaryQuery } from '@/lib/schemas/invoices';
import { queryKeys } from '@/lib/query-keys';
import { getInvoiceSummary } from '@/server/functions/invoices';

type InvoiceSummaryResult = Awaited<ReturnType<typeof getInvoiceSummary>>;

// ============================================================================
// SUMMARY HOOK
// ============================================================================

export interface UseInvoiceSummaryOptions extends Partial<InvoiceSummaryQuery> {
  enabled?: boolean;
}

/**
 * Fetch invoice summary aggregates for dashboard
 *
 * @example
 * ```tsx
 * const { data } = useInvoiceSummary();
 *
 * // Access totals
 * data?.totals.open.count;    // Number of open invoices
 * data?.totals.open.amount;   // Total value of open invoices
 * data?.totals.overdue.count; // Number of overdue invoices
 * data?.totals.paid.amount;   // Total value of paid invoices
 *
 * // Access by status
 * data?.byStatus.find(s => s.status === 'unpaid');
 * ```
 */
export function useInvoiceSummary(options: UseInvoiceSummaryOptions = {}) {
  const { enabled = true, ...filters } = options;

  const getSummaryFn = useServerFn(getInvoiceSummary);

  return useQuery({
    queryKey: queryKeys.invoices.summary(filters.statuses),
    queryFn: async () => {
      const result = await getSummaryFn({ data: filters });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute - summary data is less time-sensitive
  });
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { InvoiceSummaryResult };
