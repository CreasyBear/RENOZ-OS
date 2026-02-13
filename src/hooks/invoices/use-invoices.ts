'use client';

/**
 * Invoice Hooks
 *
 * TanStack Query hooks for invoice data fetching:
 * - Invoice list with pagination and filtering
 * - Invoice detail view
 *
 * @see docs/design-system/INVOICE-STANDARDS.md
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import type { InvoiceFilter } from '@/lib/schemas/invoices';
import { queryKeys } from '@/lib/query-keys';
import {
  getInvoices,
  getInvoice,
  voidInvoice,
} from '@/server/functions/invoices';
import type { InvoiceDetail } from '@/server/functions/invoices';

type InvoiceListResult = Awaited<ReturnType<typeof getInvoices>>;

// ============================================================================
// LIST HOOK
// ============================================================================

export interface UseInvoicesOptions extends Partial<InvoiceFilter> {
  enabled?: boolean;
}

/**
 * Fetch invoice list with filters and pagination
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useInvoices({ status: 'overdue' });
 * ```
 */
export function useInvoices(options: UseInvoicesOptions = {}) {
  const { enabled = true, ...filters } = options;

  const getInvoicesFn = useServerFn(getInvoices);

  return useQuery({
    queryKey: queryKeys.invoices.list(filters),
    queryFn: async () => {
      const result = await getInvoicesFn({ data: filters as InvoiceFilter });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================================================
// DETAIL HOOK
// ============================================================================

export interface UseInvoiceOptions {
  enabled?: boolean;
}

/**
 * Fetch single invoice with full details
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useInvoice(invoiceId);
 * ```
 */
export function useInvoice(id: string, options: UseInvoiceOptions = {}) {
  const { enabled = true } = options;

  const getInvoiceFn = useServerFn(getInvoice);

  return useQuery<InvoiceDetail, Error>({
    queryKey: queryKeys.invoices.detail(id),
    queryFn: async () => {
      const result = await getInvoiceFn({ data: { id } });
      if (result == null) throw new Error('Invoice detail returned no data');
      return result as InvoiceDetail;
    },
    enabled: enabled && !!id,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// VOID INVOICE MUTATION
// ============================================================================

/**
 * Void an invoice (sets invoiceStatus to 'canceled')
 * Only allowed from 'unpaid' or 'overdue' status.
 */
export function useVoidInvoice() {
  const queryClient = useQueryClient();

  const voidFn = useServerFn(voidInvoice);

  return useMutation({
    mutationFn: (data: { orderId: string; reason?: string }) =>
      voidFn({ data }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.detail(result.invoiceId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() });
      // Also invalidate order cache since invoiceStatus lives on orders
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { InvoiceListResult, InvoiceDetail };
