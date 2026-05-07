import type { QueryClient } from '@tanstack/react-query';
import type { FulfillmentInventoryMutationCacheResult } from '@/lib/schemas/orders';
import { queryKeys } from '@/lib/query-keys';

export interface InvalidateShipmentMutationOptions {
  shipmentId?: string;
  orderId?: string;
  includeAllOrderDetails?: boolean;
  includeFulfillment?: boolean;
}

type FulfillmentInventoryMutationResult = FulfillmentInventoryMutationCacheResult;

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

function hasKnownAffectedInventoryIdentity(
  result?: FulfillmentInventoryMutationResult | null
): boolean {
  return Array.isArray(result?.affectedInventoryIds);
}

function hasKnownAffectedProductIdentity(
  result?: FulfillmentInventoryMutationResult | null
): boolean {
  return Array.isArray(result?.affectedProductIds);
}

function invalidateAffectedInventoryDetails(
  queryClient: QueryClient,
  result?: FulfillmentInventoryMutationResult | null,
  { includeCostLayers = false }: { includeCostLayers?: boolean } = {}
) {
  const affectedInventoryIds = uniqueIds(result?.affectedInventoryIds);

  if (affectedInventoryIds.length === 0) {
    if (!hasKnownAffectedInventoryIdentity(result)) {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.details() });
    }
    return;
  }

  affectedInventoryIds.forEach((inventoryId) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.detail(inventoryId) });
    if (includeCostLayers) {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.costLayersDetail(inventoryId) });
    }
  });
}

function invalidateAffectedProductStockQueries(
  queryClient: QueryClient,
  result?: FulfillmentInventoryMutationResult | null
) {
  const affectedProductIds = uniqueIds(result?.affectedProductIds);

  if (affectedProductIds.length === 0) {
    if (!hasKnownAffectedProductIdentity(result)) {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    }
    return;
  }

  affectedProductIds.forEach((productId) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(productId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.products.inventory(productId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.products.inventoryStats(productId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.products.stockAlertsAll() });
    queryClient.invalidateQueries({ queryKey: queryKeys.products.movementsForProduct(productId) });
    queryClient.invalidateQueries({
      queryKey: queryKeys.products.movementsAggregatedForProduct(productId),
    });
  });
}

function invalidateInventorySideEffectQueries(
  queryClient: QueryClient,
  result?: FulfillmentInventoryMutationResult | null,
  { includeValuation = false }: { includeValuation?: boolean } = {}
) {
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() });
  invalidateAffectedInventoryDetails(queryClient, result, { includeCostLayers: includeValuation });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lowStock() });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.movementsAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.wmsAll() });
  if (includeValuation) {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.valuationAll() });
  }
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.availabilityAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.availableSerialsAll() });
  if (result?.touchesSerializedInventory !== false) {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.serializedAll() });
  }
  invalidateAffectedProductStockQueries(queryClient, result);
}

export function invalidatePickingInventoryReservationQueries(
  queryClient: QueryClient,
  result?: FulfillmentInventoryMutationResult | null
) {
  invalidateInventorySideEffectQueries(queryClient, result);
}

export function invalidateShipmentInventoryMutationQueries(
  queryClient: QueryClient,
  result?: FulfillmentInventoryMutationResult | null
) {
  invalidateInventorySideEffectQueries(queryClient, result, { includeValuation: true });
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
