import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

export function invalidateOrderArtifactQueries(
  queryClient: QueryClient,
  options: {
    orderId?: string | null;
    sourceOrderId?: string | null;
    customerId?: string | null;
  }
) {
  const affectedOrderIds = new Set<string>();
  for (const orderId of [options.sourceOrderId, options.orderId]) {
    if (orderId) affectedOrderIds.add(orderId);
  }

  for (const orderId of affectedOrderIds) {
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.withCustomer(orderId) });
  }

  if (affectedOrderIds.size > 0) {
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.infiniteLists() });
  }

  if (options.customerId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.byCustomer(options.customerId) });
  }
}
