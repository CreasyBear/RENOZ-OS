import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

interface InventoryMutationItemIdentity {
  id?: string | null;
  productId?: string | null;
  serialNumber?: string | null;
}

export interface InventoryStockMutationResult {
  affectedInventoryIds?: string[] | null;
  affectedProductIds?: string[] | null;
  touchesSerializedInventory?: boolean | null;
  items?: InventoryMutationItemIdentity[] | null;
  item?: InventoryMutationItemIdentity | null;
  sourceItem?: InventoryMutationItemIdentity | null;
  destinationItem?: InventoryMutationItemIdentity | null;
}

export interface InvalidateInventoryStockMutationOptions {
  productId?: string;
  productIds?: string[] | null;
  result?: InventoryStockMutationResult | null;
  touchesSerializedInventory?: boolean;
  includeMovements?: boolean;
}

function uniqueIds(ids: Array<string | null | undefined>): string[] {
  return Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
}

function hasText(value?: string | null): boolean {
  return Boolean(value?.trim());
}

function collectAffectedInventoryIds(result?: InventoryStockMutationResult | null): string[] {
  return uniqueIds([
    ...(result?.affectedInventoryIds ?? []),
    ...(result?.items ?? []).map((item) => item.id),
    result?.item?.id,
    result?.sourceItem?.id,
    result?.destinationItem?.id,
  ]);
}

function collectAffectedProductIds({
  productId,
  productIds,
  result,
}: Pick<InvalidateInventoryStockMutationOptions, 'productId' | 'productIds' | 'result'>): string[] {
  return uniqueIds([
    productId,
    ...(productIds ?? []),
    ...(result?.affectedProductIds ?? []),
    ...(result?.items ?? []).map((item) => item.productId),
  ]);
}

function hasKnownAffectedInventoryIdentity(
  result?: InventoryStockMutationResult | null
): boolean {
  return Array.isArray(result?.affectedInventoryIds);
}

function hasKnownAffectedProductIdentity(
  result?: InventoryStockMutationResult | null
): boolean {
  return Array.isArray(result?.affectedProductIds);
}

function mutationResultTouchesSerializedInventory(
  result?: InventoryStockMutationResult | null
): boolean {
  return [result?.item, result?.sourceItem, result?.destinationItem].some((item) =>
    hasText(item?.serialNumber)
  ) || (result?.items ?? []).some((item) => hasText(item.serialNumber));
}

function invalidateAffectedInventoryDetails(
  queryClient: QueryClient,
  result?: InventoryStockMutationResult | null
) {
  const affectedInventoryIds = collectAffectedInventoryIds(result);

  if (affectedInventoryIds.length === 0) {
    if (!hasKnownAffectedInventoryIdentity(result)) {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.details() });
    }
    return;
  }

  affectedInventoryIds.forEach((inventoryId) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.detail(inventoryId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.costLayersDetail(inventoryId) });
  });
}

function invalidateProductInventoryQueries(
  queryClient: QueryClient,
  options: Pick<InvalidateInventoryStockMutationOptions, 'productId' | 'productIds' | 'result'>
) {
  const affectedProductIds = collectAffectedProductIds(options);

  if (affectedProductIds.length === 0) {
    if (!hasKnownAffectedProductIdentity(options.result)) {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.details() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.searches() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.stock() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.inventories() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.inventoryStatsAll() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.stockLevelsAll() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.stockAlertsAll() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.movementsAll() });
    }
    return;
  }

  affectedProductIds.forEach((productId) => {
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
      queryKey: queryKeys.products.stockAlertsAll(),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.products.movementsForProduct(productId),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.products.movementsAggregatedForProduct(productId),
    });
  });
}

export function invalidateInventoryStockMutationQueries(
  queryClient: QueryClient,
  {
    productId,
    productIds,
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
  if (
    touchesSerializedInventory ||
    result?.touchesSerializedInventory ||
    mutationResultTouchesSerializedInventory(result)
  ) {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.serializedAll() });
  }

  invalidateProductInventoryQueries(queryClient, { productId, productIds, result });
}
