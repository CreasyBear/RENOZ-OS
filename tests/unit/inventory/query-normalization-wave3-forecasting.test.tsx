import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListForecasts = vi.fn();
const mockGetProductForecast = vi.fn();
const mockUpsertForecast = vi.fn();
const mockBulkUpdateForecasts = vi.fn();
const mockCalculateSafetyStock = vi.fn();
const mockGetReorderRecommendations = vi.fn();
const mockGetForecastAccuracy = vi.fn();
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock('@/hooks/_shared/use-toast', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

vi.mock('@/server/functions/inventory', () => ({
  listForecasts: (...args: unknown[]) => mockListForecasts(...args),
  getProductForecast: (...args: unknown[]) => mockGetProductForecast(...args),
  upsertForecast: (...args: unknown[]) => mockUpsertForecast(...args),
  bulkUpdateForecasts: (...args: unknown[]) => mockBulkUpdateForecasts(...args),
  calculateSafetyStock: (...args: unknown[]) => mockCalculateSafetyStock(...args),
  getReorderRecommendations: (...args: unknown[]) => mockGetReorderRecommendations(...args),
  getForecastAccuracy: (...args: unknown[]) => mockGetForecastAccuracy(...args),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'InventoryForecastingQueryNormalizationWave3Wrapper';
  return Wrapper;
}

describe('inventory forecasting query normalization wave 3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListForecasts.mockResolvedValue({
      forecasts: [],
      total: 0,
      page: 1,
      limit: 20,
      hasMore: false,
    });
    mockGetProductForecast.mockResolvedValue({
      product: {
        id: 'product-1',
        name: 'Battery Unit',
        sku: 'BAT-001',
      },
      forecasts: [],
      currentStock: {
        onHand: 0,
        available: 0,
      },
      historicalDemand: {
        dailyDemand: [],
        totalDemand: 0,
      },
      safetyStock: 0,
      reorderPoint: 0,
      recommendedOrderQuantity: 0,
    });
    mockCalculateSafetyStock.mockResolvedValue({
      product: {
        id: 'product-1',
        name: 'Battery Unit',
      },
      calculations: {
        serviceLevel: 0.95,
        leadTimeDays: 7,
        zScore: 1.65,
        averageDailyDemand: 0,
        demandStdDev: 0,
        safetyStock: 0,
        reorderPoint: 0,
        recommendedOrderQuantity: 10,
      },
      historical: {
        daysAnalyzed: 30,
        totalDemand: 0,
        peakDemand: 0,
        minDemand: 0,
      },
    });
    mockGetReorderRecommendations.mockResolvedValue({
      recommendations: [],
      summary: {
        totalRecommendations: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
      },
    });
    mockGetForecastAccuracy.mockResolvedValue({
      summary: {
        totalForecasts: 0,
        forecastsWithAccuracy: 0,
        averageAccuracy: null,
        period: 'monthly',
        lookbackDays: 90,
      },
      trend: [],
      benchmarks: {
        excellent: 90,
        good: 80,
        acceptable: 70,
        needsImprovement: 60,
      },
    });
  });

  it('treats forecasting list, recommendations, and accuracy reads as always-shaped success states', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useForecasts, useReorderRecommendations, useForecastAccuracy } = await import(
      '@/hooks/inventory/use-forecasting'
    );

    const forecasts = renderHook(() => useForecasts(), {
      wrapper: createWrapper(queryClient),
    });
    const recommendations = renderHook(() => useReorderRecommendations(), {
      wrapper: createWrapper(queryClient),
    });
    const accuracy = renderHook(() => useForecastAccuracy(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(forecasts.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(recommendations.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(accuracy.result.current.isSuccess).toBe(true));

    expect(forecasts.result.current.data).toEqual({
      forecasts: [],
      total: 0,
      page: 1,
      limit: 20,
      hasMore: false,
    });
    expect(recommendations.result.current.data).toEqual({
      recommendations: [],
      summary: {
        totalRecommendations: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
      },
    });
    expect(accuracy.result.current.data).toMatchObject({
      summary: {
        totalForecasts: 0,
        averageAccuracy: null,
      },
      trend: [],
    });
  });

  it('preserves not-found semantics for product forecast detail reads', async () => {
    mockGetProductForecast.mockRejectedValueOnce({
      message: 'Product not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useProductForecast } = await import('@/hooks/inventory/use-forecasting');

    const { result } = renderHook(
      () => useProductForecast('missing-product', { period: 'weekly', days: 90 }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested product forecast could not be found.',
    });
  });

  it('renders recommendation failures as unavailable instead of all stocked up', async () => {
    const { ReorderRecommendations } = await import(
      '@/components/domain/inventory/forecasting/reorder-recommendations'
    );

    render(
      <ReorderRecommendations
        recommendations={[]}
        isError
        errorMessage="Reorder recommendations are temporarily unavailable. Please refresh and try again."
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByText('Forecasting recommendations are temporarily unavailable.')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Reorder recommendations are temporarily unavailable. Please refresh and try again.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('All Stocked Up')).not.toBeInTheDocument();
  });

  it('renders forecast detail failures as unavailable instead of no forecast data', async () => {
    const { ForecastChart } = await import(
      '@/components/domain/inventory/forecasting/forecast-chart'
    );

    render(
      <ForecastChart
        productName="Battery Unit"
        data={[]}
        period="weekly"
        isError
        errorMessage="Demand forecast details are temporarily unavailable. Please refresh and try again."
        onRetry={vi.fn()}
      />
    );

    expect(
      screen.getByText(
        'Demand forecast details are temporarily unavailable. Please refresh and try again.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('No forecast data available')).not.toBeInTheDocument();
  });

  it('uses safe mutation fallback copy instead of raw forecast save errors', async () => {
    mockUpsertForecast.mockRejectedValue(
      new Error('duplicate key value violates unique constraint inventory_forecasts_unique_idx')
    );

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useUpsertForecast } = await import('@/hooks/inventory/use-forecasting');

    const { result } = renderHook(() => useUpsertForecast(), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        productId: '00000000-0000-4000-8000-000000000001',
        forecastDate: new Date('2026-05-04T00:00:00.000Z'),
        forecastPeriod: 'weekly',
        demandQuantity: 10,
      })
    ).rejects.toThrow('inventory_forecasts_unique_idx');

    expect(mockToastError).toHaveBeenCalledWith('Failed to save forecast');
  });

  it('uses safe mutation fallback copy instead of raw bulk forecast errors', async () => {
    mockBulkUpdateForecasts.mockRejectedValue(
      new Error('insert into inventory_forecasts violates row-level security policy')
    );

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useBulkUpdateForecasts } = await import('@/hooks/inventory/use-forecasting');

    const { result } = renderHook(() => useBulkUpdateForecasts(), {
      wrapper: createWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync([
        {
          productId: '00000000-0000-4000-8000-000000000001',
          forecastDate: new Date('2026-05-04T00:00:00.000Z'),
          forecastPeriod: 'weekly',
          demandQuantity: 10,
        },
      ])
    ).rejects.toThrow('row-level security policy');

    expect(mockToastError).toHaveBeenCalledWith('Failed to update forecasts');
  });

  it('uses stable route unavailable copy instead of raw forecasting read errors', async () => {
    const {
      getForecastDetailsReadErrorMessage,
      getReorderRecommendationsReadErrorMessage,
    } = await import('@/routes/_authenticated/inventory/forecasting-error-messages');

    expect(
      getReorderRecommendationsReadErrorMessage(
        new Error('select from inventory_forecasts violates row-level security policy')
      )
    ).toBe('Reorder recommendations are temporarily unavailable. Please refresh and try again.');

    expect(
      getForecastDetailsReadErrorMessage(
        new Error('forecast calculation failed with stack trace')
      )
    ).toBe('Demand forecast details are temporarily unavailable. Please refresh and try again.');
  });
});
