import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListMovements = vi.fn();
const mockListInventory = vi.fn();
const mockGetInventoryItem = vi.fn();
const mockAdjustInventory = vi.fn();
const mockTransferInventory = vi.fn();
const mockReceiveInventory = vi.fn();
const mockGetInventoryDashboard = vi.fn();
const mockQuickSearchInventory = vi.fn();
const mockGetAvailableSerials = vi.fn();
const mockGetLocationUtilization = vi.fn();

const mockUseInventoryValuation = vi.fn();
const mockUseInventoryAging = vi.fn();
const mockUseInventoryTurnover = vi.fn();
const mockUseMovements = vi.fn();
const mockUseReconcileInventoryFinance = vi.fn();

vi.mock('@/server/functions/inventory/inventory', () => ({
  listInventory: (...args: unknown[]) => mockListInventory(...args),
  getInventoryItem: (...args: unknown[]) => mockGetInventoryItem(...args),
  adjustInventory: (...args: unknown[]) => mockAdjustInventory(...args),
  transferInventory: (...args: unknown[]) => mockTransferInventory(...args),
  receiveInventory: (...args: unknown[]) => mockReceiveInventory(...args),
  listMovements: (...args: unknown[]) => mockListMovements(...args),
  getInventoryDashboard: (...args: unknown[]) => mockGetInventoryDashboard(...args),
  quickSearchInventory: (...args: unknown[]) => mockQuickSearchInventory(...args),
  getAvailableSerials: (...args: unknown[]) => mockGetAvailableSerials(...args),
}));

vi.mock('@/server/functions/inventory/locations', () => ({
  getLocationUtilization: (...args: unknown[]) => mockGetLocationUtilization(...args),
}));

vi.mock('@/hooks/inventory', () => ({
  useInventoryValuation: () => mockUseInventoryValuation(),
  useInventoryAging: () => mockUseInventoryAging(),
  useInventoryTurnover: () => mockUseInventoryTurnover(),
  useMovements: () => mockUseMovements(),
  useReconcileInventoryFinance: () => mockUseReconcileInventoryFinance(),
}));

vi.mock('@/components/layout', () => {
  const PageLayout = ({ children }: { children: ReactNode; variant?: string }) => <div>{children}</div>;
  PageLayout.displayName = 'MockMovementPageLayout';
  const Header = ({
    title,
    description,
    actions,
  }: {
    title: string;
    description?: string;
    actions?: ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {actions}
    </div>
  );
  Header.displayName = 'MockMovementPageLayoutHeader';
  const Content = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  Content.displayName = 'MockMovementPageLayoutContent';
  PageLayout.Header = Header;
  PageLayout.Content = Content;
  return { PageLayout };
});

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/domain/inventory/reports/valuation-report', () => ({
  ValuationReport: () => <div>valuation-ready</div>,
}));

vi.mock('@/components/domain/inventory/reports/aging-report', () => ({
  AgingReport: () => <div>aging-ready</div>,
}));

vi.mock('@/components/domain/inventory/reports/turnover-report', () => ({
  TurnoverReport: () => <div>turnover-ready</div>,
}));

vi.mock('@/components/domain/inventory/reports/movement-analytics', () => ({
  MovementAnalytics: ({
    summary,
    isLoading,
  }: {
    summary: unknown;
    isLoading?: boolean;
  }) => <div>{isLoading ? 'movement-loading' : summary ? 'movement-ready' : 'movement-empty'}</div>,
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'InventoryMovementQueryNormalizationWave3Wrapper';
  return Wrapper;
}

describe('inventory movement query normalization wave 3', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockListMovements.mockResolvedValue({
      movements: [],
      total: 0,
      page: 1,
      limit: 100,
      hasMore: false,
      summary: {
        totalInbound: 0,
        totalOutbound: 0,
        netChange: 0,
      },
    });
    mockGetInventoryDashboard.mockResolvedValue({
      metrics: {
        totalItems: 0,
        totalSkus: 0,
        totalUnits: 0,
        totalValue: 0,
        locationsCount: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        allocatedCount: 0,
        turnoverRate: 0,
        pendingReceipts: 0,
      },
      recentMovements: [],
      topMoving: [],
    });

    mockUseInventoryValuation.mockReturnValue({
      data: {
        totalValue: 0,
        totalUnits: 0,
        averageUnitCost: 0,
        totalSkus: 0,
        byCategory: [],
        byLocation: [],
        financeIntegrity: null,
        valuationMethod: 'fifo',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseInventoryAging.mockReturnValue({
      data: {
        summary: {
          totalItems: 0,
          totalValue: 0,
          averageAge: 0,
          valueAtRisk: 0,
          riskPercentage: 0,
        },
        aging: [],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseInventoryTurnover.mockReturnValue({
      data: {
        turnover: { turnoverRate: 0, daysOnHand: 0, periodDays: 90 },
        byProduct: [],
        trends: [],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseMovements.mockReturnValue({
      data: {
        movements: [],
        total: 0,
        page: 1,
        limit: 100,
        hasMore: false,
        summary: { totalInbound: 0, totalOutbound: 0, netChange: 0 },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseReconcileInventoryFinance.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    });
  });

  it('treats movement reads as shaped success states when no movement data exists', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useMovements, useMovementsDashboard } = await import('@/hooks/inventory/use-inventory');

    const movements = renderHook(() => useMovements({ page: 1, pageSize: 100 }), {
      wrapper: createWrapper(queryClient),
    });
    const dashboardMovements = renderHook(
      () => useMovementsDashboard({ page: 1, pageSize: 20, sortOrder: 'desc' }),
      {
        wrapper: createWrapper(queryClient),
      }
    );

    await waitFor(() => expect(movements.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(dashboardMovements.result.current.isSuccess).toBe(true));

    expect(movements.result.current.data).toMatchObject({
      movements: [],
      total: 0,
    });
    expect(dashboardMovements.result.current.data).toMatchObject({
      movements: [],
      total: 0,
    });
  });

  it('normalizes movement failures as always-shaped system errors', async () => {
    mockListMovements.mockRejectedValueOnce({
      message: 'HTTPError',
      statusCode: 503,
      code: 'INTERNAL_ERROR',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useMovements } = await import('@/hooks/inventory/use-inventory');

    const { result } = renderHook(() => useMovements({ page: 1, pageSize: 100 }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'system',
      contractType: 'always-shaped',
      message: 'Inventory movements are temporarily unavailable. Please refresh and try again.',
    });
  });

  it('renders movement failures as unavailable when no movement data is usable', async () => {
    mockUseMovements.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new Error('Inventory movements are temporarily unavailable. Please refresh and try again.'),
      refetch: vi.fn(),
    });

    const { default: AnalyticsPage } = await import('@/routes/_authenticated/inventory/analytics-page');

    render(<AnalyticsPage />);

    expect(
      await screen.findByText('Inventory movement analytics are temporarily unavailable.')
    ).toBeInTheDocument();
    expect(screen.queryByText('movement-ready')).not.toBeInTheDocument();
  });

  it('keeps empty movement success distinct from unavailable state', async () => {
    const { default: AnalyticsPage } = await import('@/routes/_authenticated/inventory/analytics-page');

    render(<AnalyticsPage />);

    expect(await screen.findByText('movement-empty')).toBeInTheDocument();
    expect(screen.queryByText('Inventory movement analytics are temporarily unavailable.')).not.toBeInTheDocument();
  });
});
