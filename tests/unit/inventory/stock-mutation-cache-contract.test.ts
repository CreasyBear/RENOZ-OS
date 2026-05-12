import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { queryKeys } from '@/lib/query-keys';
import { invalidateInventoryStockMutationQueries } from '@/hooks/inventory/_stock-mutation-cache';

describe('inventory stock mutation cache contract', () => {
  it('refreshes product stock prefixes without product root invalidation when product identity is unknown', () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    invalidateInventoryStockMutationQueries(queryClient, {
      result: {
        affectedInventoryIds: [],
        items: [],
      },
      includeMovements: true,
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.lists(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.inventory.movementsAll(),
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
      queryKey: queryKeys.products.all,
    });
  });
});
