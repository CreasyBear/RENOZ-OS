import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

export interface InvalidateShipmentMutationOptions {
  shipmentId?: string;
  orderId?: string;
  includeAllOrderDetails?: boolean;
  includeFulfillment?: boolean;
}

export function invalidateOrderCollectionQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.infiniteLists() });
}

export function invalidateFulfillmentSurfaces(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.fulfillment() });
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.fulfillmentSummary() });
  queryClient.invalidateQueries({ queryKey: queryKeys.fulfillment.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.fulfillment.kanban() });
}

export function invalidateShipmentMutationQueries(
  queryClient: QueryClient,
  {
    shipmentId,
    orderId,
    includeAllOrderDetails = false,
    includeFulfillment = true,
  }: InvalidateShipmentMutationOptions = {}
) {
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.shipments() });
  if (shipmentId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.shipmentDetail(shipmentId) });
  }

  if (orderId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.withCustomer(orderId) });
  }
  if (includeAllOrderDetails) {
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.details() });
  }

  invalidateOrderCollectionQueries(queryClient);
  if (includeFulfillment) {
    invalidateFulfillmentSurfaces(queryClient);
  }
}

export function invalidateShipmentInventorySideEffectQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.details() });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lowStock() });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.movementsAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.wmsAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.valuationAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.availabilityAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.availableSerialsAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.serializedAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
}
