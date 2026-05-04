import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetWMSDashboard = vi.fn();
const mockGetStockByCategory = vi.fn();
const mockGetStockByLocation = vi.fn();
const mockGetRecentMovementsTimeline = vi.fn();
const mockGetInventoryDashboard = vi.fn();

const mockUseWMSDashboard = vi.fn();
const mockUseInventoryDashboard = vi.fn();
const mockUseMovementsDashboard = vi.fn();
const mockUseTriggeredAlerts = vi.fn();
const mockUseAcknowledgeAlert = vi.fn();
const mockUseInventorySearch = vi.fn();
const mockUseTrackedProducts = vi.fn();

vi.mock('@/server/functions/inventory', () => ({
  getWMSDashboard: (...args: unknown[]) => mockGetWMSDashboard(...args),
  getStockByCategory: (...args: unknown[]) => mockGetStockByCategory(...args),
  getStockByLocation: (...args: unknown[]) => mockGetStockByLocation(...args),
  getRecentMovementsTimeline: (...args: unknown[]) => mockGetRecentMovementsTimeline(...args),
}));

vi.mock('@/server/functions/inventory/inventory', () => ({
  getInventoryDashboard: (...args: unknown[]) => mockGetInventoryDashboard(...args),
}));

vi.mock('@/hooks/inventory', () => ({
  useWMSDashboard: () => mockUseWMSDashboard(),
  useInventoryDashboard: () => mockUseInventoryDashboard(),
  useMovementsDashboard: () => mockUseMovementsDashboard(),
  useTriggeredAlerts: () => mockUseTriggeredAlerts(),
  useAcknowledgeAlert: () => mockUseAcknowledgeAlert(),
  useInventorySearch: () => mockUseInventorySearch(),
}));

vi.mock('@/hooks/dashboard/use-tracked-products', () => ({
  useTrackedProducts: () => mockUseTrackedProducts(),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}));

vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
  },
  useOrgFormat: () => ({
    formatCurrency: (value: number) => `$${value.toFixed(2)}`,
  }),
  useDebounce: (value: string) => value,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
    variant?: string;
    size?: string;
    className?: string;
    title?: string;
    'aria-label'?: string;
  }) => <button onClick={onClick}>{children}</button>,
  buttonVariants: () => 'button',
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value?: number }) => <div>{value ?? 0}</div>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <div />,
}));

vi.mock('@/components/shared/metric-card', () => ({
  MetricCard: ({
    title,
    value,
    subtitle,
  }: {
    title: string;
    value: ReactNode;
    subtitle?: string;
  }) => (
    <div>
      <span>{title}</span>
      <span>{value}</span>
      {subtitle ? <span>{subtitle}</span> : null}
    </div>
  ),
}));

vi.mock('@/components/shared/format', () => ({
  FormatAmount: ({ amount }: { amount: number }) => <span>{amount}</span>,
}));

vi.mock('@/components/shared/data-table', () => ({
  DataTableEmpty: ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => (
    <div>
      <span>{title}</span>
      <span>{description}</span>
    </div>
  ),
  StatusCell: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock('@/components/domain/dashboard/overview/tracked-products-dialog', () => ({
  TrackedProductsDialog: () => <div>tracked-products-dialog</div>,
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'InventoryDashboardQueryNormalizationWave3Wrapper';
  return Wrapper;
}

describe('inventory dashboard query normalization wave 3', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetWMSDashboard.mockResolvedValue({
      totals: { totalValue: 0, totalUnits: 0, totalSkus: 0 },
      comparison: {
        totalValueChange: 0,
        totalUnitsChange: 0,
        totalSkusChange: 0,
        alertsChange: 0,
        locationsChange: 0,
      },
      stockByCategory: [],
      stockByLocation: [],
      recentMovements: [],
    });
    mockGetStockByCategory.mockResolvedValue([]);
    mockGetStockByLocation.mockResolvedValue([]);
    mockGetRecentMovementsTimeline.mockResolvedValue([]);
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

    mockUseWMSDashboard.mockReturnValue({
      data: {
        totals: { totalValue: 0, totalUnits: 0, totalSkus: 0 },
        comparison: {
          totalValueChange: 0,
          totalUnitsChange: 0,
          totalSkusChange: 0,
          alertsChange: 0,
          locationsChange: 0,
        },
        stockByCategory: [],
        stockByLocation: [],
        recentMovements: [],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseInventoryDashboard.mockReturnValue({
      data: {
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
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseMovementsDashboard.mockReturnValue({ refetch: vi.fn() });
    mockUseTriggeredAlerts.mockReturnValue({
      data: { alerts: [] },
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseAcknowledgeAlert.mockReturnValue({ mutate: vi.fn() });
    mockUseInventorySearch.mockReturnValue({
      data: { items: [] },
      isLoading: false,
    });
    mockUseTrackedProducts.mockReturnValue({
      products: [],
      productsWithInventory: [],
      setProducts: vi.fn(),
      isLoading: false,
    });
  });

  it('treats WMS and dashboard reads as shaped success states', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useWMSDashboard } = await import('@/hooks/inventory/use-wms-dashboard');
    const { useInventoryDashboard } = await import('@/hooks/inventory/use-inventory');

    const wms = renderHook(() => useWMSDashboard(), {
      wrapper: createWrapper(queryClient),
    });
    const dashboard = renderHook(() => useInventoryDashboard(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(wms.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(dashboard.result.current.isSuccess).toBe(true));

    expect(wms.result.current.data).toMatchObject({
      totals: { totalValue: 0 },
      stockByCategory: [],
    });
    expect(dashboard.result.current.data).toMatchObject({
      metrics: { totalItems: 0 },
      topMoving: [],
    });
  });

  it('normalizes WMS failures as always-shaped system errors', async () => {
    mockGetWMSDashboard.mockRejectedValueOnce({
      message: 'HTTPError',
      statusCode: 503,
      code: 'INTERNAL_ERROR',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useWMSDashboard } = await import('@/hooks/inventory/use-wms-dashboard');

    const { result } = renderHook(() => useWMSDashboard(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'system',
      contractType: 'always-shaped',
      message: 'Inventory dashboard data is temporarily unavailable. Please refresh and try again.',
    });
  });

  it('renders a full-page unavailable state when WMS data is missing entirely', async () => {
    mockUseWMSDashboard.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new Error('Inventory dashboard data is temporarily unavailable. Please refresh and try again.'),
      refetch: vi.fn(),
    });

    const { UnifiedInventoryDashboard } = await import(
      '@/components/domain/inventory/unified-inventory-dashboard'
    );

    render(<UnifiedInventoryDashboard />);

    expect(await screen.findByText('Failed to load inventory data')).toBeInTheDocument();
  });

  it('keeps dashboard panels visible with degraded warnings when stale data exists', async () => {
    mockUseWMSDashboard.mockReturnValueOnce({
      data: {
        totals: { totalValue: 1200, totalUnits: 45, totalSkus: 3 },
        comparison: {
          totalValueChange: 10,
          totalUnitsChange: 5,
          totalSkusChange: 0,
          alertsChange: 1,
          locationsChange: 0,
        },
        stockByCategory: [{ categoryId: 'cat-1', categoryName: 'Batteries', unitCount: 12, totalValue: 500 }],
        stockByLocation: [{ locationId: 'loc-1', locationName: 'Main Warehouse', locationType: 'warehouse', unitCount: 45, totalValue: 1200, percentage: 100 }],
        recentMovements: [],
      },
      isLoading: false,
      error: new Error('Refresh failed for WMS.'),
      refetch: vi.fn(),
    });
    mockUseInventoryDashboard.mockReturnValueOnce({
      data: {
        metrics: {
          totalItems: 45,
          totalSkus: 3,
          totalUnits: 45,
          totalValue: 1200,
          locationsCount: 1,
          lowStockCount: 1,
          outOfStockCount: 0,
          allocatedCount: 0,
          turnoverRate: 0,
          pendingReceipts: 0,
        },
        recentMovements: [],
        topMoving: [{ productId: 'prod-1', productName: 'Battery Unit', productSku: 'BAT-001', sku: 'BAT-001', movementCount: 5, totalQuantity: 8, trend: 'up' }],
      },
      isLoading: false,
      error: new Error('Refresh failed for dashboard metrics.'),
      refetch: vi.fn(),
    });

    const { UnifiedInventoryDashboard } = await import(
      '@/components/domain/inventory/unified-inventory-dashboard'
    );

    render(<UnifiedInventoryDashboard />);

    expect(
      await screen.findByText('Showing the most recent inventory dashboard snapshot while refresh is unavailable.')
    ).toBeInTheDocument();
    expect(screen.getByText('Location breakdown may be stale.')).toBeInTheDocument();
    expect(screen.getByText('Showing the most recent dashboard metrics while refresh is unavailable.')).toBeInTheDocument();
    expect(screen.getByText('Top movers may be stale.')).toBeInTheDocument();
    expect(screen.getByText('Main Warehouse')).toBeInTheDocument();
    expect(screen.getByText('Battery Unit')).toBeInTheDocument();
  });
});
