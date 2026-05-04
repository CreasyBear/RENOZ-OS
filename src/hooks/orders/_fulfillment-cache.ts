import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

export interface InvalidateShipmentMutationOptions {
  shipmentId?: string;
  orderId?: string;
  includeAllOrderDetails?: boolean;
  includeFulfillment?: boolean;
}

export interface FulfillmentInventoryMutationResult {
  affectedInventoryIds?: string[] | null;
  affectedProductIds?: string[] | null;
  touchesSerializedInventory?: boolean | null;
}

function uniqueIds(ids?: string[] | null): string[] {
  return Array.from(new Set((ids ?? []).filter(Boolean)));
}

export function invalidateOrderCollectionQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.infiniteLists() });
}

export function invalidateOrderDetailQueries(queryClient: QueryClient, orderId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.orders.withCustomer(orderId) });
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
    invalidateOrderDetailQueries(queryClient, orderId);
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

function invalidateAffectedInventoryDetails(
  queryClient: QueryClient,
  result?: FulfillmentInventoryMutationResult | null
) {
  const affectedInventoryIds = uniqueIds(result?.affectedInventoryIds);

  if (affectedInventoryIds.length === 0) {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.details() });
    return;
  }

  affectedInventoryIds.forEach((inventoryId) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.detail(inventoryId) });
  });
}

function invalidateAffectedProductStockQueries(
  queryClient: QueryClient,
  result?: FulfillmentInventoryMutationResult | null
) {
  const affectedProductIds = uniqueIds(result?.affectedProductIds);

  if (affectedProductIds.length === 0) {
    queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    return;
  }

  affectedProductIds.forEach((productId) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(productId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.products.inventory(productId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.products.inventoryStats(productId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.products.stockAlerts(productId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.products.movementsForProduct(productId) });
    queryClient.invalidateQueries({
      queryKey: queryKeys.products.movementsAggregatedForProduct(productId),
    });
  });
}

export function invalidatePickingInventoryReservationQueries(
  queryClient: QueryClient,
  result?: FulfillmentInventoryMutationResult | null
) {
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() });
  invalidateAffectedInventoryDetails(queryClient, result);
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lowStock() });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.movementsAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.wmsAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.availabilityAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.availableSerialsAll() });
  if (result?.touchesSerializedInventory !== false) {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.serializedAll() });
  }
  invalidateAffectedProductStockQueries(queryClient, result);
}

export function invalidatePickingMutationQueries(
  queryClient: QueryClient,
  orderId: string,
  result?: FulfillmentInventoryMutationResult | null
) {
  invalidateOrderDetailQueries(queryClient, orderId);
  invalidateOrderCollectionQueries(queryClient);
  invalidateFulfillmentSurfaces(queryClient);
  invalidatePickingInventoryReservationQueries(queryClient, result);
}
