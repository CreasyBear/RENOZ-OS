/**
 * FulfillmentDashboard Container
 *
 * Container responsibilities:
 * - Fetches confirmed and in-progress picking orders via useOrders hook
 * - Fetches picked orders via useOrders hook
 * - Fetches active shipments via useShipments hook
 * - Provides workflow navigation callbacks and import mutation
 * - Passes data to presenter
 *
 * @see ./fulfillment-dashboard.tsx (presenter)
 * @see src/hooks/orders/use-orders.ts (hooks)
 * @see src/hooks/orders/use-shipments.ts (hooks)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import type { FulfillmentImport } from '@/lib/schemas/orders/shipments';
import { useFulfillmentDashboardSummary, useOrders, useShipments } from '@/hooks/orders';
import { getSummaryState } from '@/lib/metrics/summary-health';
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
  onPickOrder,
  onShipOrder,
  onViewOrder,
  onConfirmDelivery,
  highlightOrderIds,
  className,
}: FulfillmentDashboardContainerProps) {
  // ===========================================================================
  // DATA FETCHING (Container responsibility via centralized hooks)
  // ===========================================================================

  // Fetch orders waiting to enter or resume picking
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

  const {
    data: pickingOrders,
    isLoading: loadingPicking,
  } = useOrders({
    page: 1,
    pageSize: 50,
    status: 'picking',
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

  // Fetch recovery-relevant shipments (pending through failed)
  const {
    data: activeShipments,
    isLoading: loadingShipments,
  } = useShipments({
    page: 1,
    pageSize: 50,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    refetchInterval: POLLING_INTERVAL,
  });

  const {
    data: fulfillmentSummary,
    isLoading: loadingSummary,
    error: fulfillmentSummaryError,
  } = useFulfillmentDashboardSummary();

  const summaryState = getSummaryState({
    data: fulfillmentSummary,
    error: fulfillmentSummaryError,
    isLoading: loadingSummary,
  });

  // ===========================================================================
  // MUTATIONS (Container responsibility via centralized hooks)
  // ===========================================================================

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

  const pickingQueue = (() => {
    const confirmed = confirmedOrders?.orders ?? [];
    const inProgress = pickingOrders?.orders ?? [];
    const deduped = [...confirmed, ...inProgress].reduce<typeof confirmed>((acc, order) => {
      if (!acc.some((item) => item.id === order.id)) {
        acc.push(order);
      }
      return acc;
    }, []);
    deduped.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return {
      orders: deduped,
      total: deduped.length,
      page: 1,
      pageSize: deduped.length || 50,
      hasMore: false,
    };
  })();

  return (
    <FulfillmentDashboardPresenter
      confirmedOrders={pickingQueue}
      pickedOrders={pickedOrders ?? null}
      activeShipments={activeShipments ?? null}
      fulfillmentSummary={fulfillmentSummary ?? null}
      summaryState={summaryState}
      summaryWarning={
        summaryState === 'unavailable'
          ? 'Fulfillment summary metrics are temporarily unavailable. Headline cards are hidden to avoid falling back to incomplete page data.'
          : null
      }
      loadingConfirmed={loadingConfirmed || loadingPicking}
      loadingPicked={loadingPicked}
      loadingShipments={loadingShipments}
      loadingSummary={loadingSummary}
      importFulfillmentMutation={importFulfillmentMutation}
      onPickOrder={onPickOrder}
      onShipOrder={onShipOrder}
      onViewOrder={onViewOrder}
      onConfirmDelivery={onConfirmDelivery}
      highlightOrderIds={highlightOrderIds}
      className={className}
    />
  );
}

export default FulfillmentDashboardContainer;
