import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSpendMetrics = vi.fn();
const mockGetOrderMetrics = vi.fn();
const mockGetSupplierMetrics = vi.fn();
const mockGetProcurementAlerts = vi.fn();
const mockGetProcurementDashboard = vi.fn();

vi.mock('@/server/functions/suppliers/procurement-analytics', () => ({
  getSpendMetrics: (...args: unknown[]) => mockGetSpendMetrics(...args),
  getOrderMetrics: (...args: unknown[]) => mockGetOrderMetrics(...args),
  getSupplierMetrics: (...args: unknown[]) => mockGetSupplierMetrics(...args),
  getProcurementAlerts: (...args: unknown[]) => mockGetProcurementAlerts(...args),
  getProcurementDashboard: (...args: unknown[]) => mockGetProcurementDashboard(...args),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'ProcurementQueryNormalizationWave3FWrapper';
  return Wrapper;
}

describe('procurement query normalization wave 3f', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetSpendMetrics.mockResolvedValue({
      totalSpend: 0,
      trends: [],
      byCategory: [],
      bySupplier: [],
    });
    mockGetOrderMetrics.mockResolvedValue({
      totalOrders: 0,
      byStatus: {
        pendingApproval: 0,
        awaitingDelivery: 0,
        completed: 0,
      },
    });
    mockGetSupplierMetrics.mockResolvedValue({
      totalSuppliers: 0,
      activeSuppliers: 0,
      avgRating: 0,
      topPerformers: [],
    });
    mockGetProcurementAlerts.mockResolvedValue({
      alerts: [],
    });
    mockGetProcurementDashboard.mockResolvedValue({
      supplierPerformance: [],
      spendAnalysis: {
        byCategory: [],
        bySupplier: [],
        trends: [],
      },
      efficiencyMetrics: {
        avgProcessingTime: 0,
        approvalCycleTime: 0,
        orderFulfillmentRate: 0,
        costSavingsRate: 0,
        automationRate: 0,
        supplierDiversity: 0,
      },
      costSavings: {
        totalSavings: 0,
        savingsByType: [],
        monthlySavings: [],
      },
    });
  });

  it('treats spend metrics as always-shaped and accepts empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useSpendMetrics } = await import('@/hooks/suppliers/use-procurement-analytics');

    const { result } = renderHook(() => useSpendMetrics(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      totalSpend: 0,
      trends: [],
    });
  });

  it('normalizes procurement alert failures as always-shaped system errors', async () => {
    mockGetProcurementAlerts.mockRejectedValueOnce({
      message: 'HTTPError',
      statusCode: 503,
      code: 'INTERNAL_ERROR',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useProcurementAlerts } = await import('@/hooks/suppliers/use-procurement-analytics');

    const { result } = renderHook(() => useProcurementAlerts(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'system',
      contractType: 'always-shaped',
      message: 'Procurement alerts are temporarily unavailable. Please refresh and try again.',
    });
  });

  it('normalizes procurement dashboard failures as always-shaped system errors', async () => {
    mockGetProcurementDashboard.mockRejectedValueOnce({
      message: 'HTTPError',
      statusCode: 503,
      code: 'INTERNAL_ERROR',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useProcurementDashboard } = await import('@/hooks/suppliers/use-procurement-analytics');

    const { result } = renderHook(() => useProcurementDashboard(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'system',
      contractType: 'always-shaped',
      message: 'Procurement analytics are temporarily unavailable. Please refresh and try again.',
    });
  });
});
