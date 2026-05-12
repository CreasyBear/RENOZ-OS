import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

const mockRollbackBulkOperation = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock('@/server/functions/customers/rollback', () => ({
  listRecentBulkOperations: vi.fn(),
  rollbackBulkOperation: (...args: unknown[]) => mockRollbackBulkOperation(...args),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'CustomerRollbackCacheContractWrapper';
  return Wrapper;
}

describe('customer rollback cache contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refreshes customer rollback surfaces without customer analytics root invalidation', async () => {
    mockRollbackBulkOperation.mockResolvedValue({
      restored: 1,
      restoredCustomerIds: ['customer-1'],
    });

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { useRollbackBulkOperation } = await import('@/hooks/customers/use-rollback');

    const { result } = renderHook(() => useRollbackBulkOperation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync('audit-log-1');
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customers.lists(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customers.bulkOperations.recentLists(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customers.health.all(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customers.detail('customer-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customers.health.metrics('customer-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customers.health.historyLists('customer-1'),
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customerAnalytics.kpisAll(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customerAnalytics.trendsAll(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customerAnalytics.segments(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customerAnalytics.segmentAnalyticsAll(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customerAnalytics.healthDistribution(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customerAnalytics.lifecycleStages(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customerAnalytics.lifecycleCohortsAll(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customerAnalytics.churnMetricsAll(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customerAnalytics.conversionFunnelAll(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customerAnalytics.acquisitionMetricsAll(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customerAnalytics.quickStatsAll(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customerAnalytics.topCustomersAll(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customerAnalytics.valueTiers(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customerAnalytics.valueKpisAll(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.customerAnalytics.profitabilitySegmentsAll(),
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: queryKeys.customerAnalytics.all,
    });
  });
});
