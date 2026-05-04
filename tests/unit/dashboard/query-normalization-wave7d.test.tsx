import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.RESEND_API_KEY = 're_test_key';

const mockGetRevenueAttribution = vi.fn();

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: vi.fn() };
  },
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@tanstack/react-start', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-start')>('@tanstack/react-start');
  return {
    ...actual,
    useServerFn: () => mockGetRevenueAttribution,
  };
});

vi.mock('@/hooks/financial/use-financial', () => ({
  useRevenueByPeriod: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/hooks/orders/use-orders', () => ({
  useOrders: () => ({
    data: { orders: [] },
    isLoading: false,
    error: null,
  }),
  useOrderStats: () => ({
    data: { pendingOrders: 0 },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/hooks/jobs/use-active-projects', () => ({
  useActiveProjects: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/hooks/inventory/use-inventory', () => ({
  useInventoryDashboard: () => ({
    data: { metrics: { lowStockCount: 0, outOfStockCount: 0 } },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/hooks/dashboard', () => ({
  useDashboardMetrics: () => ({
    data: {
      summary: {
        revenue: { current: 0, change: 0 },
        revenueCash: { current: 0, change: 0 },
        pipelineValue: { current: 0, change: 0 },
        ordersCount: { current: 0, change: 0 },
        customersCount: { current: 0, change: 0 },
      },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useTargetProgress: () => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    status: 'success',
  }),
  useTrackedProducts: () => ({
    productsWithInventory: [],
    setProducts: vi.fn(),
    isLoading: false,
    maxProducts: 5,
    trackedProductsWarning: null,
    trackedProductsUnavailable: null,
  }),
}));

vi.mock('@/hooks/use-org-format', () => ({
  useOrgFormat: () => ({
    formatCurrency: (value: number) => `$${value}`,
    formatNumber: (value: number) => `${value}`,
  }),
}));

vi.mock('@/components/domain/dashboard/dashboard-context', () => ({
  useDashboardDateRange: () => ({
    dateRange: { from: new Date('2026-04-01T00:00:00Z'), to: new Date('2026-04-21T00:00:00Z') },
  }),
}));

vi.mock('@/hooks/filters/use-filter-url-state', () => ({
  serializeDateForUrl: (value?: Date | null) => value?.toISOString().slice(0, 10) ?? null,
}));

vi.mock('@/components/domain/dashboard/overview/overview-dashboard', () => ({
  OverviewDashboard: ({
    stats,
    statsSummaryWarning,
  }: {
    stats: {
      wonThisMonth: { count: number | null; value: number | null; summaryState: string };
    };
    statsSummaryWarning?: string | null;
  }) => (
    <div>
      <div>won-state:{stats.wonThisMonth.summaryState}</div>
      <div>won-count:{String(stats.wonThisMonth.count)}</div>
      <div>won-value:{String(stats.wonThisMonth.value)}</div>
      {statsSummaryWarning ? <div>{statsSummaryWarning}</div> : null}
    </div>
  ),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'Wave7DWrapper';
  return Wrapper;
}

describe('wave 7d overview reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('treats missing won-this-month data as unavailable instead of fake zero', async () => {
    mockGetRevenueAttribution.mockResolvedValueOnce(null);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { OverviewContainer } = await import('@/components/domain/dashboard/overview/overview-container');

    render(<OverviewContainer />, { wrapper: createWrapper(queryClient) });

    await waitFor(() => expect(screen.getByText('won-state:unavailable')).toBeInTheDocument());
    expect(screen.getByText('won-count:null')).toBeInTheDocument();
    expect(screen.getByText('won-value:null')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Some overview metrics are temporarily unavailable. Headline cards may be incomplete until the summaries recover.'
      )
    ).toBeInTheDocument();
  });

  it('keeps won-this-month metrics visible when stale data exists', async () => {
    mockGetRevenueAttribution.mockResolvedValueOnce({
      totals: {
        wonCount: 2,
        wonValue: 5000,
      },
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { OverviewContainer } = await import('@/components/domain/dashboard/overview/overview-container');

    render(<OverviewContainer />, { wrapper: createWrapper(queryClient) });

    await waitFor(() => expect(screen.getByText('won-state:ready')).toBeInTheDocument());
    expect(screen.getByText('won-count:2')).toBeInTheDocument();
    expect(screen.getByText('won-value:5000')).toBeInTheDocument();
  });
});
