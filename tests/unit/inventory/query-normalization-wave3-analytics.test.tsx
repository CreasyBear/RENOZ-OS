import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListCostLayers = vi.fn();
const mockGetInventoryCostLayers = vi.fn();
const mockCreateCostLayer = vi.fn();
const mockGetInventoryValuation = vi.fn();
const mockGetInventoryFinanceIntegrity = vi.fn();
const mockReconcileInventoryFinanceIntegrity = vi.fn();
const mockCalculateCOGS = vi.fn();
const mockGetInventoryAging = vi.fn();
const mockGetInventoryTurnover = vi.fn();

const mockUseInventoryValuation = vi.fn();
const mockUseInventoryAging = vi.fn();
const mockUseInventoryTurnover = vi.fn();
const mockUseMovements = vi.fn();
const mockUseReconcileInventoryFinance = vi.fn();

vi.mock('@/server/functions/inventory', () => ({
  listCostLayers: (...args: unknown[]) => mockListCostLayers(...args),
  getInventoryCostLayers: (...args: unknown[]) => mockGetInventoryCostLayers(...args),
  createCostLayer: (...args: unknown[]) => mockCreateCostLayer(...args),
  getInventoryValuation: (...args: unknown[]) => mockGetInventoryValuation(...args),
  getInventoryFinanceIntegrity: (...args: unknown[]) => mockGetInventoryFinanceIntegrity(...args),
  reconcileInventoryFinanceIntegrity: (...args: unknown[]) =>
    mockReconcileInventoryFinanceIntegrity(...args),
  calculateCOGS: (...args: unknown[]) => mockCalculateCOGS(...args),
  getInventoryAging: (...args: unknown[]) => mockGetInventoryAging(...args),
  getInventoryTurnover: (...args: unknown[]) => mockGetInventoryTurnover(...args),
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
  PageLayout.displayName = 'MockAnalyticsPageLayout';
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
  Header.displayName = 'MockAnalyticsPageLayoutHeader';
  const Content = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  Content.displayName = 'MockAnalyticsPageLayoutContent';
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
  ValuationReport: ({
    summary,
    isLoading,
  }: {
    summary: unknown;
    isLoading?: boolean;
  }) => <div>{isLoading ? 'valuation-loading' : summary ? 'valuation-ready' : 'valuation-empty'}</div>,
}));

vi.mock('@/components/domain/inventory/reports/aging-report', () => ({
  AgingReport: ({
    summary,
    isLoading,
  }: {
    summary: unknown;
    isLoading?: boolean;
  }) => <div>{isLoading ? 'aging-loading' : summary ? 'aging-ready' : 'aging-empty'}</div>,
}));

vi.mock('@/components/domain/inventory/reports/turnover-report', () => ({
  TurnoverReport: ({
    summary,
    isLoading,
  }: {
    summary: unknown;
    isLoading?: boolean;
  }) => <div>{isLoading ? 'turnover-loading' : summary ? 'turnover-ready' : 'turnover-empty'}</div>,
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
  Wrapper.displayName = 'InventoryAnalyticsQueryNormalizationWave3Wrapper';
  return Wrapper;
}

describe('inventory analytics query normalization wave 3', () => {
  beforeEach(() => {
    vi.clearAllMocks();

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

  it('treats valuation, finance integrity, aging, and turnover reads as shaped success states', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const {
      useCostLayers,
      useInventoryValuation,
      useInventoryFinanceIntegrity,
      useInventoryAging,
      useInventoryTurnover,
    } = await import('@/hooks/inventory/use-valuation');

    const costLayers = renderHook(() => useCostLayers(), {
      wrapper: createWrapper(queryClient),
    });
    const valuation = renderHook(() => useInventoryValuation(), {
      wrapper: createWrapper(queryClient),
    });
    const integrity = renderHook(() => useInventoryFinanceIntegrity(), {
      wrapper: createWrapper(queryClient),
    });
    const aging = renderHook(() => useInventoryAging(), {
      wrapper: createWrapper(queryClient),
    });
    const turnover = renderHook(() => useInventoryTurnover({ period: '90d' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(costLayers.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(valuation.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(integrity.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(aging.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(turnover.result.current.isSuccess).toBe(true));

    expect(costLayers.result.current.data).toMatchObject({ layers: [], total: 0 });
    expect(valuation.result.current.data).toMatchObject({ totalValue: 0, byCategory: [] });
    expect(integrity.result.current.data).toMatchObject({ status: 'green' });
    expect(aging.result.current.data).toMatchObject({
      summary: { totalItems: 0 },
      aging: [],
    });
    expect(turnover.result.current.data).toMatchObject({
      turnover: { turnoverRate: 0 },
      byProduct: [],
    });
  });

  it('preserves not-found semantics for inventory cost layer detail reads', async () => {
    mockGetInventoryCostLayers.mockRejectedValueOnce({
      message: 'Inventory item not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useInventoryCostLayers } = await import('@/hooks/inventory/use-valuation');

    const { result } = renderHook(() => useInventoryCostLayers('missing-item'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested inventory item could not be found.',
    });
  });

  it('preserves validation semantics for COGS preview reads', async () => {
    mockCalculateCOGS.mockRejectedValueOnce({
      message: 'Insufficient inventory for COGS calculation',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useCOGSPreview } = await import('@/hooks/inventory/use-valuation');

    const { result } = renderHook(() => useCOGSPreview('inventory-1', 99), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'validation',
      contractType: 'detail-not-found',
      message:
        'COGS preview is temporarily unavailable for the requested quantity. Please adjust the quantity or try again.',
    });
  });

  it('renders an unavailable valuation state when the headline read fails without data', async () => {
    mockUseInventoryValuation.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new Error('Inventory valuation is temporarily unavailable. Please refresh and try again.'),
      refetch: vi.fn(),
    });

    const { default: AnalyticsPage } = await import('@/routes/_authenticated/inventory/analytics-page');

    render(<AnalyticsPage />);

    expect(
      await screen.findByText('Inventory valuation is temporarily unavailable.')
    ).toBeInTheDocument();
    expect(screen.queryByText('valuation-ready')).not.toBeInTheDocument();
  });

  it('keeps valuation tabs in the healthy path for shaped zero-state success', async () => {
    const { default: AnalyticsPage } = await import('@/routes/_authenticated/inventory/analytics-page');

    render(<AnalyticsPage />);

    expect(await screen.findByText('valuation-ready')).toBeInTheDocument();
    expect(screen.queryByText('Inventory valuation is temporarily unavailable.')).not.toBeInTheDocument();
  });
});
