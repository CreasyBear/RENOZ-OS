/**
 * FulfillmentDashboard Container
 *
 * Container responsibilities:
 * - Fetches confirmed orders via useOrders hook
 * - Fetches picked orders via useOrders hook
 * - Fetches active shipments via useShipments hook
 * - Provides order status mutation
 * - Passes data to presenter
 *
 * @see ./fulfillment-dashboard.tsx (presenter)
 * @see src/hooks/orders/use-orders.ts (hooks)
 * @see src/hooks/orders/use-shipments.ts (hooks)
 * @see src/hooks/orders/use-order-status.ts (mutations)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import type { FulfillmentImport } from '@/lib/schemas/orders/shipments';
import { useOrders, useShipments, useUpdateOrderStatus } from '@/hooks/orders';
import { importFulfillmentShipments } from '@/server/functions/orders/order-shipments';
import { FulfillmentDashboardPresenter } from './fulfillment-dashboard';
import type { FulfillmentDashboardContainerProps } from './fulfillment-dashboard';

// ============================================================================
// CONSTANTS
// ============================================================================

const POLLING_INTERVAL = 30000; // 30 seconds

// ============================================================================
// CONTAINER
// ============================================================================

export function FulfillmentDashboardContainer({
  onShipOrder,
  onViewOrder,
  onConfirmDelivery,
  highlightOrderIds,
  className,
}: FulfillmentDashboardContainerProps) {
  // ===========================================================================
  // DATA FETCHING (Container responsibility via centralized hooks)
  // ===========================================================================

  // Fetch orders in "confirmed" status (picking queue)
  const {
    data: confirmedOrders,
    isLoading: loadingConfirmed,
  } = useOrders({
    page: 1,
    pageSize: 50,
    status: 'confirmed',
    sortBy: 'createdAt',
    sortOrder: 'asc',
    refetchInterval: POLLING_INTERVAL,
  } as Parameters<typeof useOrders>[0] & { refetchInterval?: number });

  // Fetch orders in "picked" status (shipping queue)
  const {
    data: pickedOrders,
    isLoading: loadingPicked,
  } = useOrders({
    page: 1,
    pageSize: 50,
    status: 'picked',
    sortBy: 'createdAt',
    sortOrder: 'asc',
    refetchInterval: POLLING_INTERVAL,
  } as Parameters<typeof useOrders>[0] & { refetchInterval?: number });

  // Fetch active shipments (in_transit)
  const {
    data: activeShipments,
    isLoading: loadingShipments,
  } = useShipments({
    page: 1,
    pageSize: 50,
    status: 'in_transit',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    refetchInterval: POLLING_INTERVAL,
  });

  // ===========================================================================
  // MUTATIONS (Container responsibility via centralized hooks)
  // ===========================================================================

  const updateOrderStatusMutation = useUpdateOrderStatus();
  const queryClient = useQueryClient();

  const importFulfillmentFn = useServerFn(importFulfillmentShipments);

  const importFulfillmentMutation = useMutation({
    mutationFn: (input: FulfillmentImport) => importFulfillmentFn({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.shipments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.fulfillment() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
  });

  return (
    <FulfillmentDashboardPresenter
      confirmedOrders={confirmedOrders ?? null}
      pickedOrders={pickedOrders ?? null}
      activeShipments={activeShipments ?? null}
      loadingConfirmed={loadingConfirmed}
      loadingPicked={loadingPicked}
      loadingShipments={loadingShipments}
      updateOrderStatusMutation={updateOrderStatusMutation}
      importFulfillmentMutation={importFulfillmentMutation}
      onShipOrder={onShipOrder}
      onViewOrder={onViewOrder}
      onConfirmDelivery={onConfirmDelivery}
      highlightOrderIds={highlightOrderIds}
      className={className}
    />
  );
}

export default FulfillmentDashboardContainer;
