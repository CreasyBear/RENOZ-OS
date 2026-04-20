import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListStockCounts = vi.fn();
const mockGetStockCount = vi.fn();
const mockCreateStockCount = vi.fn();
const mockUpdateStockCount = vi.fn();
const mockStartStockCount = vi.fn();
const mockUpdateStockCountItem = vi.fn();
const mockBulkUpdateCountItems = vi.fn();
const mockCompleteStockCount = vi.fn();
const mockCancelStockCount = vi.fn();
const mockGetCountVarianceAnalysis = vi.fn();
const mockGetCountHistory = vi.fn();

vi.mock('@/server/functions/inventory', () => ({
  listStockCounts: (...args: unknown[]) => mockListStockCounts(...args),
  getStockCount: (...args: unknown[]) => mockGetStockCount(...args),
  createStockCount: (...args: unknown[]) => mockCreateStockCount(...args),
  updateStockCount: (...args: unknown[]) => mockUpdateStockCount(...args),
  startStockCount: (...args: unknown[]) => mockStartStockCount(...args),
  updateStockCountItem: (...args: unknown[]) => mockUpdateStockCountItem(...args),
  bulkUpdateCountItems: (...args: unknown[]) => mockBulkUpdateCountItems(...args),
  completeStockCount: (...args: unknown[]) => mockCompleteStockCount(...args),
  cancelStockCount: (...args: unknown[]) => mockCancelStockCount(...args),
  getCountVarianceAnalysis: (...args: unknown[]) => mockGetCountVarianceAnalysis(...args),
  getCountHistory: (...args: unknown[]) => mockGetCountHistory(...args),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'InventoryStockCountsQueryNormalizationWave3Wrapper';
  return Wrapper;
}

describe('inventory stock counts query normalization wave 3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListStockCounts.mockResolvedValue({
      counts: [],
      total: 0,
      page: 1,
      limit: 50,
      hasMore: false,
    });
    mockGetStockCount.mockResolvedValue({
      count: {
        id: 'count-1',
        countCode: 'COUNT-001',
        countType: 'cycle',
        status: 'draft',
        locationId: null,
        assignedTo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        items: [],
        location: null,
      },
      progress: {
        totalItems: 0,
        countedItems: 0,
        pendingItems: 0,
        varianceItems: 0,
        completionPercentage: 0,
      },
    });
    mockGetCountVarianceAnalysis.mockResolvedValue({
      count: { id: 'count-1', countCode: 'COUNT-001' },
      items: [],
      summary: {
        totalItems: 0,
        itemsWithVariance: 0,
        accuracyRate: 100,
        totalExpected: 0,
        totalCounted: 0,
        netVariance: 0,
        totalValueImpact: 0,
        positiveVariances: 0,
        negativeVariances: 0,
      },
    });
    mockGetCountHistory.mockResolvedValue({
      counts: [],
      summary: {
        totalCounts: 0,
        averageAccuracyRate: 100,
      },
    });
  });

  it('treats stock count lists and history as always-shaped success states', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useStockCounts, useCountHistory } = await import('@/hooks/inventory/use-stock-counts');

    const counts = renderHook(() => useStockCounts({ page: 1, pageSize: 50 }), {
      wrapper: createWrapper(queryClient),
    });
    const history = renderHook(() => useCountHistory({}, true), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(counts.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(history.result.current.isSuccess).toBe(true));

    expect(counts.result.current.data).toEqual({
      counts: [],
      total: 0,
      page: 1,
      limit: 50,
      hasMore: false,
    });
    expect(history.result.current.data).toMatchObject({
      counts: [],
      summary: {
        totalCounts: 0,
      },
    });
  });

  it('preserves not-found semantics for stock count detail reads', async () => {
    mockGetStockCount.mockRejectedValueOnce({
      message: 'Stock count not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useStockCount } = await import('@/hooks/inventory/use-stock-counts');

    const { result } = renderHook(() => useStockCount('missing-count'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested stock count could not be found.',
    });
  });

  it('renders stock count list failures as unavailable instead of an empty state', async () => {
    const retry = vi.fn();
    const { StockCountList } = await import('@/components/domain/inventory/counts/stock-count-list');

    render(
      <StockCountList
        counts={[]}
        isError
        errorMessage="Stock counts are temporarily unavailable. Please refresh and try again."
        onRetry={retry}
      />
    );

    expect(screen.getByText('Stock counts are temporarily unavailable.')).toBeInTheDocument();
    expect(
      screen.getByText('Stock counts are temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.queryByText('No stock counts found')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry Stock Counts' }));
    expect(retry).toHaveBeenCalled();
  });

  it('keeps cached stock counts visible when a refetch fails', async () => {
    const { StockCountList } = await import('@/components/domain/inventory/counts/stock-count-list');

    render(
      <StockCountList
        counts={[
          {
            id: 'count-1',
            countCode: 'COUNT-001',
            countType: 'cycle',
            status: 'in_progress',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ]}
        isError
        errorMessage="Refresh failed. The list below may be stale until the next successful reload."
      />
    );

    expect(
      screen.getByText('Showing the most recent stock counts while refresh is unavailable.')
    ).toBeInTheDocument();
    expect(screen.getByText('COUNT-001')).toBeInTheDocument();
    expect(screen.queryByText('Stock counts are temporarily unavailable.')).not.toBeInTheDocument();
    expect(screen.queryByText('No stock counts found')).not.toBeInTheDocument();
  });
});
