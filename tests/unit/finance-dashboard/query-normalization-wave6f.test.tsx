import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetFinancialSummaryReport = vi.fn();
const mockListTargets = vi.fn();
const mockGetTarget = vi.fn();
const mockGetTargetProgress = vi.fn();
const mockGetDashboardMetrics = vi.fn();

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: vi.fn() };
  },
}));

vi.mock('@tanstack/react-start', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-start')>('@tanstack/react-start');
  return { ...actual, useServerFn: (fn: unknown) => fn };
});

vi.mock('@/server/functions/reports', () => ({
  getFinancialSummaryReport: (...args: unknown[]) => mockGetFinancialSummaryReport(...args),
  generateFinancialSummaryReport: vi.fn(),
  listTargets: (...args: unknown[]) => mockListTargets(...args),
  getTarget: (...args: unknown[]) => mockGetTarget(...args),
  createTarget: vi.fn(),
  updateTarget: vi.fn(),
  deleteTarget: vi.fn(),
  getTargetProgress: (...args: unknown[]) => mockGetTargetProgress(...args),
  bulkCreateTargets: vi.fn(),
  bulkUpdateTargets: vi.fn(),
  bulkDeleteTargets: vi.fn(),
}));

vi.mock('@/server/functions/dashboard', () => ({
  getDashboardMetrics: (...args: unknown[]) => mockGetDashboardMetrics(...args),
  getMetricsComparison: vi.fn().mockResolvedValue({}),
  getEnhancedComparison: vi.fn().mockResolvedValue({}),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'Wave6FWrapper';
  return Wrapper;
}

describe('wave 6f finance/reports/dashboard normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFinancialSummaryReport.mockResolvedValue({
      kpis: {
        revenue: 0,
        arBalance: 0,
        overdueAmount: 0,
        cashReceived: 0,
        gstCollected: 0,
      },
      trends: [],
      cashFlow: {
        cashReceived: 0,
        arBalance: 0,
        overdueAmount: 0,
        invoiceCount: 0,
        overdueCount: 0,
      },
      periodStart: new Date('2026-04-01'),
      periodEnd: new Date('2026-04-21'),
    });
    mockListTargets.mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });
    mockGetTarget.mockResolvedValue({ id: 'target-1', name: 'Revenue' });
    mockGetTargetProgress.mockResolvedValue({
      targets: [],
      overall: {
        achieved: 0,
        total: 0,
        percentage: 0,
      },
    });
    mockGetDashboardMetrics.mockResolvedValue({
      dateRange: { from: new Date('2026-04-01'), to: new Date('2026-04-21'), preset: '30d' },
      lastUpdated: new Date('2026-04-21'),
      kpis: [],
    });
  });

  it('treats finance/report summaries and targets as healthy shaped success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useFinancialSummaryReport } = await import('@/hooks/reports/use-financial-summary');
    const { useTargets, useTargetProgress } = await import('@/hooks/reports/use-targets');
    const { useDashboardMetrics } = await import('@/hooks/dashboard/use-dashboard-metrics');

    const summary = renderHook(
      () =>
        useFinancialSummaryReport({
          dateFrom: new Date('2026-04-01'),
          dateTo: new Date('2026-04-21'),
        }),
      { wrapper: createWrapper(queryClient) }
    );
    const targets = renderHook(() => useTargets(), { wrapper: createWrapper(queryClient) });
    const progress = renderHook(() => useTargetProgress(), { wrapper: createWrapper(queryClient) });
    const metrics = renderHook(() => useDashboardMetrics(), { wrapper: createWrapper(queryClient) });

    await waitFor(() => expect(summary.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(targets.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(progress.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(metrics.result.current.isSuccess).toBe(true));

    expect(summary.result.current.data?.trends).toEqual([]);
    expect(targets.result.current.data?.items).toEqual([]);
    expect(progress.result.current.data?.targets).toEqual([]);
  });

  it('preserves not-found semantics for target detail', async () => {
    mockGetTarget.mockRejectedValueOnce({
      message: 'Target not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useTarget } = await import('@/hooks/reports/use-targets');

    const target = renderHook(() => useTarget({ id: 'missing-target' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(target.result.current.error).toBeTruthy());
    expect(target.result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
    });
  });

  it('keeps the financial page in degraded mode when some data remains usable', async () => {
    vi.resetModules();
    vi.doMock('@/hooks/financial', () => ({
      useFinancialDashboardMetrics: () => ({
        data: { kpis: [] },
        isLoading: false,
        error: new Error('Financial dashboard metrics are temporarily unavailable. Please refresh and try again.'),
      }),
      useRevenueByPeriod: () => ({ data: { periods: [] }, isLoading: false, error: null }),
      useTopCustomersByRevenue: () => ({ data: { items: [] }, isLoading: false, error: null }),
      useOutstandingInvoices: () => ({ data: { items: [] }, isLoading: false, error: null }),
    }));
    vi.doMock('@/components/domain/financial/financial-dashboard', () => ({
      FinancialDashboard: ({ error }: { error?: Error }) => (
        <div>{error ? 'blocking error' : 'dashboard available'}</div>
      ),
    }));
    vi.doMock('@tanstack/react-router', () => ({ Link: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

    const { default: FinancialPage } = await import('@/routes/_authenticated/financial/financial-page');
    render(<FinancialPage />);

    expect(screen.getByText('Showing your latest financial snapshot')).toBeInTheDocument();
    expect(screen.getByText('dashboard available')).toBeInTheDocument();
    expect(screen.queryByText('blocking error')).not.toBeInTheDocument();
  });
});
