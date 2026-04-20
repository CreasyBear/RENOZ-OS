import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetProductInventory = vi.fn();
const mockGetInventoryStats = vi.fn();
const mockGetLowStockAlerts = vi.fn();
const mockGetProductMovements = vi.fn();
const mockListLocations = vi.fn();
const mockGetAggregatedProductMovements = vi.fn();
const mockGetProductCostLayers = vi.fn();
const mockGetInventoryCountsByProductIds = vi.fn();
const mockGetInventoryCountsBySkus = vi.fn();
const mockListDashboardLayouts = vi.fn();
const mockGetDashboardLayout = vi.fn();
const mockGetUserLayout = vi.fn();
const mockGetAvailableWidgets = vi.fn();
const mockGetRecentOutstandingInvoices = vi.fn();

vi.mock('@/server/functions/products/product-inventory', () => ({
  getProductInventory: (...args: unknown[]) => mockGetProductInventory(...args),
  getInventoryStats: (...args: unknown[]) => mockGetInventoryStats(...args),
  getLowStockAlerts: (...args: unknown[]) => mockGetLowStockAlerts(...args),
  getProductMovements: (...args: unknown[]) => mockGetProductMovements(...args),
  adjustStock: vi.fn(),
  listLocations: (...args: unknown[]) => mockListLocations(...args),
  getAggregatedProductMovements: (...args: unknown[]) => mockGetAggregatedProductMovements(...args),
}));

vi.mock('@/server/functions/inventory/valuation', () => ({
  getProductCostLayers: (...args: unknown[]) => mockGetProductCostLayers(...args),
}));

vi.mock('@/server/functions/dashboard', () => ({
  getInventoryCountsByProductIds: (...args: unknown[]) => mockGetInventoryCountsByProductIds(...args),
  getInventoryCountsBySkus: (...args: unknown[]) => mockGetInventoryCountsBySkus(...args),
  listDashboardLayouts: (...args: unknown[]) => mockListDashboardLayouts(...args),
  getDashboardLayout: (...args: unknown[]) => mockGetDashboardLayout(...args),
  getUserLayout: (...args: unknown[]) => mockGetUserLayout(...args),
  createDashboardLayout: vi.fn(),
  updateDashboardLayout: vi.fn(),
  saveDashboardLayout: vi.fn(),
  deleteDashboardLayout: vi.fn(),
  setDefaultDashboardLayout: vi.fn(),
  cloneDashboardLayout: vi.fn(),
  getAvailableWidgets: (...args: unknown[]) => mockGetAvailableWidgets(...args),
}));

vi.mock('@/server/functions/dashboard/recent-items', () => ({
  getRecentOutstandingInvoices: (...args: unknown[]) => mockGetRecentOutstandingInvoices(...args),
  getRecentOverdueInvoices: vi.fn(),
  getRecentOpportunities: vi.fn(),
  getRecentOrdersToShip: vi.fn(),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'DashboardQueryNormalizationWave5CWrapper';
  return Wrapper;
}

describe('dashboard/product operational query normalization wave 5c', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const storage = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
      },
    });

    mockGetProductInventory.mockResolvedValue({
      productId: 'product-1',
      sku: 'PK-1',
      name: 'Panel Kit',
      totalOnHand: 0,
      totalAllocated: 0,
      totalAvailable: 0,
      totalValue: 0,
      locationCount: 0,
      locations: [],
    });
    mockGetInventoryStats.mockResolvedValue({
      totalOnHand: 0,
      totalAllocated: 0,
      totalAvailable: 0,
      totalValue: 0,
      locationCount: 0,
      avgUnitCost: 0,
      last30Days: {
        movementCount: 0,
        totalIn: 0,
        totalOut: 0,
      },
    });
    mockGetLowStockAlerts.mockResolvedValue([]);
    mockGetProductMovements.mockResolvedValue({
      movements: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    mockListLocations.mockResolvedValue([]);
    mockGetAggregatedProductMovements.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    mockGetProductCostLayers.mockResolvedValue({
      layers: [],
      summary: {
        totalLayers: 0,
        activeLayers: 0,
        totalRemaining: 0,
        totalValue: 0,
        weightedAvgCost: 0,
        lastPurchaseCost: 0,
      },
    });
    mockGetInventoryCountsByProductIds.mockResolvedValue({});
    mockGetInventoryCountsBySkus.mockResolvedValue({});
    mockListDashboardLayouts.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
      },
    });
    mockGetDashboardLayout.mockResolvedValue({
      id: 'layout-1',
      name: 'Default',
      isDefault: true,
      layout: {
        widgets: [
          {
            id: 'widget-1',
            type: 'kpi_cards',
            title: 'KPI Cards',
            position: { x: 0, y: 0, width: 12, height: 2 },
            settings: {},
          },
        ],
        gridColumns: 12,
        theme: 'system',
        compactMode: false,
      },
      filters: null,
    });
    mockGetUserLayout.mockResolvedValue({
      layout: null,
      availableWidgets: [],
    });
    mockGetAvailableWidgets.mockResolvedValue([]);
    mockGetRecentOutstandingInvoices.mockResolvedValue({
      items: [],
      total: 0,
    });
  });

  it('treats recent items, inventory counts, and user layout null as healthy shaped success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useInventoryCountsBySkus } = await import('@/hooks/dashboard/use-inventory-counts');
    const { useRecentOutstandingInvoices } = await import('@/hooks/dashboard/use-recent-items');
    const { useUserLayout } = await import('@/hooks/dashboard/use-dashboard-layouts');

    const counts = renderHook(
      () =>
        useInventoryCountsBySkus({
          skuPatterns: [{ key: 'kits', patterns: ['KIT'] }],
        }),
      { wrapper: createWrapper(queryClient) }
    );
    const recent = renderHook(() => useRecentOutstandingInvoices(), {
      wrapper: createWrapper(queryClient),
    });
    const userLayout = renderHook(() => useUserLayout(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(counts.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(recent.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(userLayout.result.current.isSuccess).toBe(true));

    expect(counts.result.current.data).toEqual({});
    expect(recent.result.current.data).toEqual({ items: [], total: 0 });
    expect(userLayout.result.current.data).toEqual({
      layout: null,
      availableWidgets: [],
    });
  });

  it('preserves not-found semantics for product inventory and dashboard layout detail reads', async () => {
    mockGetProductInventory.mockRejectedValueOnce({
      message: 'Product not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    });
    mockGetDashboardLayout.mockRejectedValueOnce({
      message: 'Layout not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useProductInventory } = await import('@/hooks/products/use-product-inventory');
    const { useDashboardLayout } = await import('@/hooks/dashboard/use-dashboard-layouts');

    const inventory = renderHook(
      () => useProductInventory({ productId: 'missing-product' }),
      { wrapper: createWrapper(queryClient) }
    );
    const layout = renderHook(
      () => useDashboardLayout({ id: 'missing-layout' }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(inventory.result.current.error).toBeTruthy());
    await waitFor(() => expect(layout.result.current.error).toBeTruthy());

    expect(inventory.result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested product could not be found.',
    });
    expect(layout.result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested dashboard layout could not be found.',
    });
  });

  it('surfaces unavailable state instead of fake zero inventory when product inventory cold-load fails', async () => {
    vi.resetModules();
    vi.doMock('@/hooks/products', () => ({
      useProductInventory: () => ({
        data: undefined,
        isLoading: false,
        error: new Error('Product inventory is temporarily unavailable. Please refresh and try again.'),
        refetch: vi.fn(),
      }),
      useProductInventoryStats: () => ({
        data: undefined,
        isLoading: false,
        error: null,
      }),
      useProductCostLayers: () => ({
        data: undefined,
        error: null,
      }),
      useLowStockAlerts: () => ({
        data: [],
        error: null,
      }),
    }));
    vi.doMock('@/hooks/suppliers', () => ({
      usePriceLists: () => ({ data: undefined }),
    }));
    vi.doMock('@/components/domain/products/tabs/inventory-tab-view', () => ({
      ProductInventoryTabView: () => <div>Rendered inventory tab</div>,
    }));

    const { ProductInventoryTabContainer } = await import(
      '@/components/domain/products/tabs/inventory-tab-container'
    );

    render(
      <ProductInventoryTabContainer
        productId="product-1"
        trackInventory={true}
        isSerialized={false}
      />
    );

    expect(screen.getByText('Inventory unavailable')).toBeInTheDocument();
    expect(
      screen.getByText('Product inventory is temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Rendered inventory tab')).not.toBeInTheDocument();
  });

  it('marks tracked product counts unavailable instead of falling back to zero counts', async () => {
    localStorage.setItem(
      'dashboard:tracked-products',
      JSON.stringify([{ id: 'product-1', sku: 'PK-1', name: 'Panel Kit' }])
    );
    mockGetInventoryCountsByProductIds.mockRejectedValueOnce({
      message: 'Inventory counts unavailable',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useTrackedProducts } = await import('@/hooks/dashboard/use-tracked-products');

    const { result } = renderHook(() => useTrackedProducts(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());

    expect(result.current.products).toEqual([
      { id: 'product-1', sku: 'PK-1', name: 'Panel Kit' },
    ]);
    expect(result.current.productsWithInventory).toEqual([]);
    expect(result.current.trackedProductsUnavailable).toBe(
      'Tracked product inventory is temporarily unavailable. Please refresh and try again.'
    );
  });
});
