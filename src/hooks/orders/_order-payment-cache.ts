import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { invalidateOrderBalanceReportingQueries } from '@/hooks/financial/_reporting-cache';

export function invalidateOrderPaymentLedger(
  queryClient: QueryClient,
  orderId: string,
  options: { paymentId?: string } = {}
) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.orders.payments(orderId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.orders.paymentSummary(orderId),
  });

  if (options.paymentId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.orders.paymentDetail(options.paymentId),
    });
  }

  queryClient.invalidateQueries({
    queryKey: queryKeys.orders.detail(orderId),
  });
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.infiniteLists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(orderId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.invoices.summary() });
  invalidateOrderBalanceReportingQueries(queryClient, { includeCashRevenue: true });
}
