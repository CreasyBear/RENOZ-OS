import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetWMSDashboard = vi.fn();
const mockGetStockByCategory = vi.fn();
const mockGetStockByLocation = vi.fn();
const mockGetRecentMovementsTimeline = vi.fn();
const mockListCostLayers = vi.fn();
const mockGetInventoryCostLayers = vi.fn();
const mockGetInventoryValuation = vi.fn();
const mockGetInventoryFinanceIntegrity = vi.fn();
const mockCalculateCOGS = vi.fn();
const mockGetInventoryAging = vi.fn();
const mockGetInventoryTurnover = vi.fn();
const mockListMovements = vi.fn();

vi.mock('@/server/functions/inventory', () => ({
  getWMSDashboard: (...args: unknown[]) => mockGetWMSDashboard(...args),
  getStockByCategory: (...args: unknown[]) => mockGetStockByCategory(...args),
  getStockByLocation: (...args: unknown[]) => mockGetStockByLocation(...args),
  getRecentMovementsTimeline: (...args: unknown[]) => mockGetRecentMovementsTimeline(...args),
  listCostLayers: (...args: unknown[]) => mockListCostLayers(...args),
  getInventoryCostLayers: (...args: unknown[]) => mockGetInventoryCostLayers(...args),
  createCostLayer: vi.fn(),
  getInventoryValuation: (...args: unknown[]) => mockGetInventoryValuation(...args),
  getInventoryFinanceIntegrity: (...args: unknown[]) => mockGetInventoryFinanceIntegrity(...args),
  reconcileInventoryFinanceIntegrity: vi.fn(),
  calculateCOGS: (...args: unknown[]) => mockCalculateCOGS(...args),
  getInventoryAging: (...args: unknown[]) => mockGetInventoryAging(...args),
  getInventoryTurnover: (...args: unknown[]) => mockGetInventoryTurnover(...args),
}));

vi.mock('@/server/functions/inventory/inventory', () => ({
  listInventory: vi.fn(),
  getInventoryItem: vi.fn(),
  adjustInventory: vi.fn(),
  transferInventory: vi.fn(),
  receiveInventory: vi.fn(),
  listMovements: (...args: unknown[]) => mockListMovements(...args),
  getInventoryDashboard: vi.fn().mockResolvedValue({}),
  quickSearchInventory: vi.fn().mockResolvedValue({ items: [] }),
  getAvailableSerials: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/server/functions/inventory/locations', () => ({
  getLocationUtilization: vi.fn().mockResolvedValue([]),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'Wave7BWrapper';
  return Wrapper;
}

describe('wave 7b inventory reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWMSDashboard.mockResolvedValue({
      totals: { totalValue: 0, totalUnits: 0, totalSkus: 0 },
      stockByCategory: [],
      stockByLocation: [],
      recentMovements: [],
    });
    mockGetStockByCategory.mockResolvedValue([]);
    mockGetStockByLocation.mockResolvedValue([]);
    mockGetRecentMovementsTimeline.mockResolvedValue([]);
    mockListCostLayers.mockResolvedValue({
      layers: [],
      total: 0,
      page: 1,
      limit: 50,
      hasMore: false,
    });
    mockGetInventoryCostLayers.mockResolvedValue({
      layers: [],
      summary: {
        totalLayers: 0,
        activeLayers: 0,
        depletedLayers: 0,
        totalRemaining: 0,
        totalValue: 0,
        weightedAverageCost: 0,
        oldestLayerDate: null,
        newestLayerDate: null,
      },
    });
    mockGetInventoryValuation.mockResolvedValue({
      totalValue: 0,
      totalSkus: 0,
      totalUnits: 0,
      averageUnitCost: 0,
      byCategory: [],
      byLocation: [],
      byProduct: [],
      valuationMethod: 'fifo',
      asOf: new Date().toISOString(),
      financeIntegrity: null,
    });
    mockGetInventoryFinanceIntegrity.mockResolvedValue({
      status: 'green',
      stockWithoutActiveLayers: 0,
      inventoryValueMismatchCount: 0,
      totalAbsoluteValueDrift: 0,
      negativeOrOverconsumedLayers: 0,
      duplicateActiveSerializedAllocations: 0,
      shipmentLinkStatusMismatch: 0,
      topDriftItems: [],
      asOf: new Date().toISOString(),
    });
    mockCalculateCOGS.mockResolvedValue({
      inventoryId: 'inventory-1',
      quantity: 1,
      unitCost: 10,
      totalCost: 10,
      costLayersConsumed: [],
      simulated: true,
    });
    mockGetInventoryAging.mockResolvedValue({
      summary: {
        totalItems: 0,
        totalValue: 0,
        averageAge: 0,
        valueAtRisk: 0,
        riskPercentage: 0,
      },
      aging: [],
    });
    mockGetInventoryTurnover.mockResolvedValue({
      turnover: {
        turnoverRate: 0,
        daysOnHand: 0,
        periodDays: 90,
      },
      byProduct: [],
      trends: [],
    });
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
  });

  it('treats WMS, valuation, and movement reads as healthy shaped empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useWMSDashboard } = await import('@/hooks/inventory/use-wms-dashboard');
    const { useInventoryValuation, useInventoryFinanceIntegrity } = await import(
      '@/hooks/inventory/use-valuation'
    );
    const { useMovements } = await import('@/hooks/inventory/use-inventory');

    const wms = renderHook(() => useWMSDashboard(), { wrapper: createWrapper(queryClient) });
    const valuation = renderHook(() => useInventoryValuation(), {
      wrapper: createWrapper(queryClient),
    });
    const financeIntegrity = renderHook(() => useInventoryFinanceIntegrity(), {
      wrapper: createWrapper(queryClient),
    });
    const movements = renderHook(() => useMovements({ page: 1, pageSize: 100 }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(wms.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(valuation.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(financeIntegrity.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(movements.result.current.isSuccess).toBe(true));

    expect(wms.result.current.data?.totals.totalValue).toBe(0);
    expect(valuation.result.current.data?.byCategory).toEqual([]);
    expect(financeIntegrity.result.current.data?.status).toBe('green');
    expect(movements.result.current.data?.movements).toEqual([]);
  });

  it('preserves not-found semantics for inventory cost-layer detail reads', async () => {
    mockGetInventoryCostLayers.mockRejectedValueOnce({
      message: 'Missing inventory item',
      code: 'NOT_FOUND',
      statusCode: 404,
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useInventoryCostLayers } = await import('@/hooks/inventory/use-valuation');

    const detail = renderHook(() => useInventoryCostLayers('missing-item'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(detail.result.current.error).toBeTruthy());
    expect(detail.result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested inventory item could not be found.',
    });
  });

  it('shows unavailable inventory header totals instead of fake zero values on cold-load failure', async () => {
    vi.resetModules();
    vi.doMock('@/hooks/inventory', () => ({
      useWMSDashboard: () => ({
        data: undefined,
        error: new Error('Inventory dashboard data is temporarily unavailable. Please refresh and try again.'),
      }),
    }));
    vi.doMock('@/components/layout', () => ({
      PageLayout: Object.assign(
        ({ children }: { children: ReactNode; variant?: string }) => <div>{children}</div>,
        {
          Header: ({
            title,
            description,
            actions,
          }: {
            title: ReactNode;
            description?: ReactNode;
            actions?: ReactNode;
          }) => (
            <div>
              <div>{title}</div>
              <div>{description}</div>
              {actions}
            </div>
          ),
          Content: ({ children }: { children: ReactNode }) => <div>{children}</div>,
        }
      ),
    }));
    vi.doMock('@/components/domain/inventory/unified-inventory-dashboard', () => ({
      UnifiedInventoryDashboard: () => <div>dashboard-body</div>,
    }));
    vi.doMock('@/components/shared/format', () => ({
      FormatAmount: ({ amount }: { amount: number }) => <span>{amount}</span>,
    }));

    const { default: InventoryPage } = await import('@/routes/_authenticated/inventory/inventory-page');
    render(<InventoryPage />);

    expect(screen.getByText('Inventory totals unavailable')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('0 units in stock')).not.toBeInTheDocument();
    expect(screen.getByText('dashboard-body')).toBeInTheDocument();
  });

  it('keeps inventory analytics visible with degraded warnings when stale report data exists', async () => {
    vi.resetModules();
    vi.doMock('@/hooks/inventory', () => ({
      useInventoryValuation: () => ({
        data: {
          totalValue: 5000,
          totalSkus: 4,
          totalUnits: 10,
          averageUnitCost: 500,
          byCategory: [],
          byLocation: [],
          valuationMethod: 'fifo',
        },
        isLoading: false,
        error: new Error('Inventory valuation is temporarily unavailable. Please refresh and try again.'),
        refetch: vi.fn(),
      }),
      useInventoryAging: () => ({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      }),
      useInventoryTurnover: () => ({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      }),
      useMovements: () => ({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      }),
      useReconcileInventoryFinance: () => ({
        mutateAsync: vi.fn(),
        isPending: false,
      }),
    }));
    vi.doMock('@/components/layout', () => {
      const PageLayout = ({ children }: { children: ReactNode; variant?: string }) => <div>{children}</div>;
      PageLayout.displayName = 'Wave7BAnalyticsLayout';
      const Header = ({
        title,
        description,
        actions,
      }: {
        title: ReactNode;
        description?: ReactNode;
        actions?: ReactNode;
      }) => (
        <div>
          <div>{title}</div>
          <div>{description}</div>
          {actions}
        </div>
      );
      Header.displayName = 'Wave7BAnalyticsLayoutHeader';
      const Content = ({ children }: { children: ReactNode }) => <div>{children}</div>;
      Content.displayName = 'Wave7BAnalyticsLayoutContent';
      PageLayout.Header = Header;
      PageLayout.Content = Content;
      return { PageLayout };
    });
    vi.doMock('@/components/ui/tabs', () => ({
      Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
      TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
      TabsTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
      TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    }));
    vi.doMock('@/components/ui/button', () => ({
      Button: ({ children }: { children: ReactNode }) => <button>{children}</button>,
    }));
    vi.doMock('@/components/ui/card', () => ({
      Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
      CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    }));
    vi.doMock('@/components/domain/inventory/reports/valuation-report', () => ({
      ValuationReport: () => <div>valuation-report</div>,
    }));
    vi.doMock('@/components/domain/inventory/reports/aging-report', () => ({
      AgingReport: () => <div>aging-report</div>,
    }));
    vi.doMock('@/components/domain/inventory/reports/turnover-report', () => ({
      TurnoverReport: () => <div>turnover-report</div>,
    }));
    vi.doMock('@/components/domain/inventory/reports/movement-analytics', () => ({
      MovementAnalytics: () => <div>movement-report</div>,
    }));

    const { default: AnalyticsPage } = await import('@/routes/_authenticated/inventory/analytics-page');
    render(<AnalyticsPage />);

    expect(
      screen.getByText('Showing the most recent inventory valuation while refresh is unavailable.')
    ).toBeInTheDocument();
    expect(screen.getByText('valuation-report')).toBeInTheDocument();
  });
});
