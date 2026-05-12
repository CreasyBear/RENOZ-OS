import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { queryKeys } from '@/lib/query-keys';
import { invalidateShipmentInventoryMutationQueries } from '@/hooks/orders/_fulfillment-cache';

describe('orders fulfillment cache contract', () => {
  it('refreshes product stock prefixes without product root invalidation when product identity is unknown', () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    invalidateShipmentInventoryMutationQueries(queryClient, {
      affectedInventoryIds: [],
      touchesSerializedInventory: false,
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.lists(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.movementsAll(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.valuationAll(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.lists(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.details(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.searches(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.stock(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.inventories(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.inventoryStatsAll(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.stockLevelsAll(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.stockAlertsAll(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.products.movementsAll(),
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.details(),
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.serializedAll(),
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.products.all,
    });
  });
});
