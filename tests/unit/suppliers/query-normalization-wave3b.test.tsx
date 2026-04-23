import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.RESEND_API_KEY = 're_test_key';

const mockListSuppliers = vi.fn();
const mockGetSupplier = vi.fn();
const mockGetSupplierPerformance = vi.fn();
const mockListPriceLists = vi.fn();

vi.mock('@/server/functions/suppliers', () => ({
  listSuppliers: (...args: unknown[]) => mockListSuppliers(...args),
  getSupplier: (...args: unknown[]) => mockGetSupplier(...args),
  createSupplier: vi.fn(),
  updateSupplier: vi.fn(),
  deleteSupplier: vi.fn(),
  updateSupplierRating: vi.fn(),
  getSupplierPerformance: (...args: unknown[]) => mockGetSupplierPerformance(...args),
  deletePriceList: vi.fn(),
  deletePriceAgreement: vi.fn(),
  cancelPriceChangeRequest: vi.fn(),
}));

vi.mock('@/server/functions/suppliers/pricing', () => ({
  listPriceLists: (...args: unknown[]) => mockListPriceLists(...args),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/shared/activity', () => ({
  UnifiedActivityTimeline: () => <div>activity-timeline</div>,
}));

vi.mock('@/hooks/products', () => ({
  useProducts: () => ({
    data: { products: [] },
    isLoading: false,
  }),
  useProduct: () => ({
    data: {
      product: {
        id: 'product-1',
        name: 'Widget',
        sku: 'W-1',
        description: 'Widget description',
        basePrice: 10,
        costPrice: 8,
        status: 'active',
        isActive: true,
      },
    },
    error: null,
    isLoading: false,
  }),
}));

vi.mock('@/hooks/suppliers', () => ({
  useSuppliers: () => ({
    data: null,
    isLoading: false,
    error: new Error('Supplier list is temporarily unavailable. Please refresh and try again.'),
  }),
  usePriceLists: () => ({
    data: null,
    isLoading: false,
    error: new Error('Supplier pricing is temporarily unavailable. Please refresh and try again.'),
  }),
}));

vi.mock('@/hooks/suppliers/use-purchase-orders', () => ({
  useCreatePurchaseOrder: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));

vi.mock('@/components/layout', () => ({
  PageLayout: Object.assign(
    ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    {
      Header: ({ title, description, actions }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode }) => (
        <div>
          <div>{title}</div>
          {description ? <div>{description}</div> : null}
          {actions}
        </div>
      ),
      Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    }
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
  }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <div>{children}</div>
  ),
  AlertTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/domain/suppliers/po-creation-wizard', () => ({
  POCreationWizard: ({
    initialSupplierId,
  }: {
    initialSupplierId?: string | null;
  }) => <div>po-wizard:{initialSupplierId ?? 'none'}</div>,
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'SuppliersQueryNormalizationWave3BWrapper';
  return Wrapper;
}

describe('suppliers query normalization wave 3b', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListSuppliers.mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });
    mockGetSupplier.mockResolvedValue({
      id: 'supplier-1',
      name: 'Northwind Supply',
      supplierCode: 'SUP-001',
      status: 'active',
      currency: 'AUD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      performanceMetrics: [],
    });
    mockGetSupplierPerformance.mockResolvedValue({
      metrics: [],
      aggregates: null,
    });
    mockListPriceLists.mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 },
    });
  });

  it('treats supplier list as always-shaped and accepts empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useSuppliers } = await import('@/hooks/suppliers/use-suppliers');

    const { result } = renderHook(() => useSuppliers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      items: [],
      pagination: { totalItems: 0 },
    });
  });

  it('preserves not-found semantics for supplier detail reads', async () => {
    mockGetSupplier.mockRejectedValueOnce({
      message: 'Supplier not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useSupplier } = await import('@/hooks/suppliers/use-suppliers');

    const { result } = renderHook(() => useSupplier('missing-supplier'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested supplier could not be found.',
    });
  });

  it('normalizes supplier performance failures as always-shaped system errors', async () => {
    mockGetSupplierPerformance.mockRejectedValueOnce({
      message: 'HTTPError',
      statusCode: 503,
      code: 'INTERNAL_ERROR',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useSupplierPerformance } = await import('@/hooks/suppliers/use-suppliers');

    const { result } = renderHook(() => useSupplierPerformance('supplier-1'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'system',
      contractType: 'always-shaped',
      message: 'Supplier performance metrics are temporarily unavailable. Please refresh and try again.',
    });
  });

  it('shows degraded supplier detail panels instead of fake empty states', async () => {
    const { SupplierDetailView } = await import('@/components/domain/suppliers/views/supplier-detail-view');

    render(
      <SupplierDetailView
        supplier={{
          id: 'supplier-1',
          supplierCode: 'SUP-001',
          name: 'Northwind Supply',
          status: 'active',
          currency: 'AUD',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          performanceMetrics: [],
        }}
        activeTab="orders"
        onTabChange={vi.fn()}
        showMetaPanel={false}
        onToggleMetaPanel={vi.fn()}
        purchaseOrders={[]}
        purchaseOrdersError={new Error('Supplier orders unavailable')}
        priceAgreements={[]}
        priceAgreementsError={new Error('Supplier pricing unavailable')}
        activities={[]}
      />
    );

    expect(
      screen.getByText('Purchase orders are temporarily unavailable for this supplier. Refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getAllByText('!')).toHaveLength(2);
  }, 20000);

  it('keeps purchase-order create flow visible when supplier and pricing lookups fail', async () => {
    const PurchaseOrderCreatePage = (await import('@/routes/_authenticated/purchase-orders/-create-page')).default;

    render(
      <PurchaseOrderCreatePage
        search={{
          productId: 'product-1',
          source: 'product_detail',
        }}
      />
    );

    expect(screen.getByText('Supplier list unavailable')).toBeInTheDocument();
    expect(screen.getByText('Preferred supplier pricing unavailable')).toBeInTheDocument();
    expect(screen.getByText('po-wizard:none')).toBeInTheDocument();
  });
});
