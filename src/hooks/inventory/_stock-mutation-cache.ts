import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

interface InventoryMutationItemIdentity {
  id?: string | null;
  serialNumber?: string | null;
}

export interface InventoryStockMutationResult {
  affectedInventoryIds?: string[] | null;
  item?: InventoryMutationItemIdentity | null;
  sourceItem?: InventoryMutationItemIdentity | null;
  destinationItem?: InventoryMutationItemIdentity | null;
}

export interface InvalidateInventoryStockMutationOptions {
  productId: string;
  result?: InventoryStockMutationResult | null;
  touchesSerializedInventory?: boolean;
  includeMovements?: boolean;
}

function hasText(value?: string | null): boolean {
  return Boolean(value?.trim());
}

function collectAffectedInventoryIds(result?: InventoryStockMutationResult | null): string[] {
  const ids = new Set<string>();

  result?.affectedInventoryIds?.forEach((id) => {
    if (id) ids.add(id);
  });

  [result?.item, result?.sourceItem, result?.destinationItem].forEach((item) => {
    if (item?.id) ids.add(item.id);
  });

  return Array.from(ids);
}

function mutationResultTouchesSerializedInventory(
  result?: InventoryStockMutationResult | null
): boolean {
  return [result?.item, result?.sourceItem, result?.destinationItem].some((item) =>
    hasText(item?.serialNumber)
  );
}

function invalidateAffectedInventoryDetails(
  queryClient: QueryClient,
  result?: InventoryStockMutationResult | null
) {
  const affectedInventoryIds = collectAffectedInventoryIds(result);

  if (affectedInventoryIds.length === 0) {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.details() });
    return;
  }

  affectedInventoryIds.forEach((inventoryId) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.detail(inventoryId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.costLayersDetail(inventoryId) });
  });
}

function invalidateProductInventoryQueries(queryClient: QueryClient, productId: string) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.products.detail(productId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.products.inventory(productId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.products.inventoryStats(productId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.products.stockAlerts(productId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.products.movementsForProduct(productId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.products.movementsAggregatedForProduct(productId),
  });
}

export function invalidateInventoryStockMutationQueries(
  queryClient: QueryClient,
  {
    productId,
    result,
    touchesSerializedInventory = false,
    includeMovements = false,
  }: InvalidateInventoryStockMutationOptions
) {
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() });
  invalidateAffectedInventoryDetails(queryClient, result);
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lowStock() });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.dashboard() });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.wmsAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.valuationAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.availabilityAll() });
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.availableSerialsAll() });
  if (includeMovements) {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.movementsAll() });
  }
  if (touchesSerializedInventory || mutationResultTouchesSerializedInventory(result)) {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.serializedAll() });
  }

  invalidateProductInventoryQueries(queryClient, productId);
}
