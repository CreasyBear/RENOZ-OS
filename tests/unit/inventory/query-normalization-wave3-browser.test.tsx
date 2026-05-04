import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
const mockUseInventory = vi.fn();
const mockUseProducts = vi.fn();
const mockUseLocations = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (config: unknown) => config,
  useNavigate: () => mockNavigate,
}));

vi.mock('@/components/layout', () => {
  const PageLayout = ({ children }: { children: ReactNode; variant?: string }) => <div>{children}</div>;
  PageLayout.displayName = 'MockInventoryBrowserLayout';
  const Header = ({
    title,
    description,
  }: {
    title: ReactNode;
    description?: ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </div>
  );
  Header.displayName = 'MockInventoryBrowserLayoutHeader';
  const Content = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  Content.displayName = 'MockInventoryBrowserLayoutContent';
  PageLayout.Header = Header;
  PageLayout.Content = Content;
  return { PageLayout, RouteErrorFallback: () => <div>route error</div> };
});

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/domain/inventory/inventory-browser', () => ({
  InventoryBrowser: ({ items }: { items: unknown[] }) => (
    <div>Inventory Browser Stub: {items.length}</div>
  ),
}));

vi.mock('@/components/domain/inventory/serialized-items/serialized-items-list-container', () => ({
  SerializedItemsListContainer: () => <div>Serialized Items Stub</div>,
}));

vi.mock('@/components/skeletons/inventory', () => ({
  InventoryTableSkeleton: () => <div>inventory skeleton</div>,
}));

vi.mock('@/hooks/inventory', () => ({
  useInventory: (...args: unknown[]) => mockUseInventory(...args),
}));

vi.mock('@/hooks/inventory/use-locations', () => ({
  useLocations: (...args: unknown[]) => mockUseLocations(...args),
}));

vi.mock('@/hooks/products', () => ({
  useProducts: (...args: unknown[]) => mockUseProducts(...args),
}));

const defaultSearch = {
  view: 'inventory' as const,
  page: 1,
  pageSize: 20,
  status: undefined,
  qualityStatus: undefined,
  sortOrder: 'desc' as const,
};

describe('inventory browser query normalization wave 3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProducts.mockReturnValue({ data: { products: [] } });
    mockUseLocations.mockReturnValue({ locations: [] });
    mockUseInventory.mockReturnValue({
      data: { items: [], total: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('uses stable unavailable copy instead of raw inventory list errors', async () => {
    mockUseInventory.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('select from inventory violates row-level security policy'),
      refetch: vi.fn(),
    });

    const { default: InventoryBrowserPage } = await import(
      '@/routes/_authenticated/inventory/inventory-browser-page'
    );

    render(<InventoryBrowserPage search={defaultSearch} />);

    expect(screen.getByText('Unable to load inventory')).toBeInTheDocument();
    expect(
      screen.getByText('Inventory data is temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/row-level security policy/i)).not.toBeInTheDocument();
  });

  it('keeps cached inventory visible with stable degraded copy', async () => {
    mockUseInventory.mockReturnValue({
      data: {
        items: [
          {
            id: 'inventory-1',
            productId: 'product-1',
            product: { name: 'Battery Unit', sku: 'BAT-001' },
            locationId: 'location-1',
            location: { name: 'Main Warehouse', locationCode: 'MAIN' },
            quantityOnHand: 1,
            quantityAllocated: 0,
            quantityAvailable: 1,
            unitCost: 100,
            totalValue: 100,
            status: 'available',
            serialNumber: null,
            lotNumber: null,
            expiryDate: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
        total: 1,
      },
      isLoading: false,
      error: new Error('select from inventory failed with stack detail'),
      refetch: vi.fn(),
    });

    const { default: InventoryBrowserPage } = await import(
      '@/routes/_authenticated/inventory/inventory-browser-page'
    );

    render(<InventoryBrowserPage search={defaultSearch} />);

    expect(screen.getByText('Showing cached inventory results')).toBeInTheDocument();
    expect(screen.getByText('Inventory Browser Stub: 1')).toBeInTheDocument();
    expect(
      screen.getByText('Inventory data is temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/stack detail/i)).not.toBeInTheDocument();
  });
});
