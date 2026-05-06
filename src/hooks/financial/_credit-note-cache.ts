import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { invalidateOrderBalanceReportingQueries } from './_reporting-cache';

export function invalidateCreditNoteQueries(
  queryClient: QueryClient,
  options: {
    creditNoteId?: string | null;
    customerId?: string | null;
    orderId?: string | null;
    appliedOrderId?: string | null;
    refreshReporting?: boolean;
  } = {}
) {
  queryClient.invalidateQueries({ queryKey: queryKeys.financial.creditNotes() });

  if (options.creditNoteId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.financial.creditNoteDetail(options.creditNoteId),
    });
  }

  if (options.customerId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.customers.detail(options.customerId),
    });
  }

  const affectedOrderIds = new Set<string>();
  for (const orderId of [options.orderId, options.appliedOrderId]) {
    if (orderId) affectedOrderIds.add(orderId);
  }

  for (const orderId of affectedOrderIds) {
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
  }

  if (affectedOrderIds.size > 0) {
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.infiniteLists() });
  }

  if (options.refreshReporting) {
    for (const orderId of affectedOrderIds) {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(orderId) });
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.invoices.summary() });
    invalidateOrderBalanceReportingQueries(queryClient);
  }
}
