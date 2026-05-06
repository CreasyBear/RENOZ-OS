import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

export function invalidateOrderBalanceReportingQueries(
  queryClient: QueryClient,
  options: {
    includeCashRevenue?: boolean;
  } = {}
) {
  queryClient.invalidateQueries({ queryKey: queryKeys.financial.arAging() });
  queryClient.invalidateQueries({ queryKey: queryKeys.financial.dashboard() });
  queryClient.invalidateQueries({ queryKey: queryKeys.financial.outstandingInvoices() });
  queryClient.invalidateQueries({ queryKey: queryKeys.financial.topCustomers() });
  queryClient.invalidateQueries({ queryKey: queryKeys.financial.reminderCandidates() });

  if (options.includeCashRevenue) {
    queryClient.invalidateQueries({ queryKey: queryKeys.financial.revenue() });
  }
}
