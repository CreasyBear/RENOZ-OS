'use client';

/**
 * Invoice Status Mutation Hooks
 *
 * TanStack Query mutations for invoice status updates.
 *
 * @see docs/design-system/INVOICE-STANDARDS.md
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import type { UpdateInvoiceStatusInput } from '@/lib/schemas/invoices';
import { queryKeys } from '@/lib/query-keys';
import {
  updateInvoiceStatus,
  markInvoiceViewed,
} from '@/server/functions/invoices';

type UpdateStatusResult = Awaited<ReturnType<typeof updateInvoiceStatus>>;

// ============================================================================
// STATUS UPDATE MUTATION
// ============================================================================

/**
 * Update invoice status with cache invalidation
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useUpdateInvoiceStatus();
 *
 * mutate({
 *   id: invoiceId,
 *   status: 'paid',
 *   paidAt: new Date(),
 * });
 * ```
 */
export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  const updateStatusFn = useServerFn(updateInvoiceStatus);

  return useMutation({
    mutationFn: (input: UpdateInvoiceStatusInput) => updateStatusFn({ data: input }),
    onSuccess: (result) => {
      // Invalidate both list and detail queries per STANDARDS.md
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.detail(result.invoiceId),
      });
      // Also invalidate summary for dashboard updates
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.summary() });
    },
  });
}

// ============================================================================
// MARK VIEWED MUTATION
// ============================================================================

/**
 * Mark invoice as viewed (for tracking engagement)
 *
 * @example
 * ```tsx
 * const { mutate } = useMarkInvoiceViewed();
 * mutate(invoiceId);
 * ```
 */
export function useMarkInvoiceViewed() {
  const queryClient = useQueryClient();

  const markViewedFn = useServerFn(markInvoiceViewed);

  return useMutation({
    mutationFn: (id: string) => markViewedFn({ data: { id } }),
    onSuccess: (_, id) => {
      // Only invalidate the specific detail
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(id) });
    },
  });
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { UpdateStatusResult };
