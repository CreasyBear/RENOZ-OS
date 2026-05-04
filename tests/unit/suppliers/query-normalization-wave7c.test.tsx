import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListSuppliers = vi.fn();
const mockGetSupplier = vi.fn();
const mockGetSupplierPerformance = vi.fn();
const mockListPriceLists = vi.fn();
const mockListPurchaseOrders = vi.fn();
const mockGetReceivingDashboardSummary = vi.fn();
const mockGetPurchaseOrderStatusCounts = vi.fn();
const mockGetPurchaseOrder = vi.fn();

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
  listPurchaseOrders: (...args: unknown[]) => mockListPurchaseOrders(...args),
  getReceivingDashboardSummary: (...args: unknown[]) => mockGetReceivingDashboardSummary(...args),
  getPurchaseOrderStatusCounts: (...args: unknown[]) => mockGetPurchaseOrderStatusCounts(...args),
  getPurchaseOrder: (...args: unknown[]) => mockGetPurchaseOrder(...args),
  createPurchaseOrder: vi.fn(),
  updatePurchaseOrder: vi.fn(),
  deletePurchaseOrder: vi.fn(),
  bulkDeletePurchaseOrders: vi.fn(),
  submitForApproval: vi.fn(),
  approvePurchaseOrder: vi.fn(),
  rejectPurchaseOrder: vi.fn(),
  markAsOrdered: vi.fn(),
  cancelPurchaseOrder: vi.fn(),
  closePurchaseOrder: vi.fn(),
  addPurchaseOrderItem: vi.fn(),
  removePurchaseOrderItem: vi.fn(),
}));

vi.mock('@/server/functions/suppliers/pricing', () => ({
  listPriceLists: (...args: unknown[]) => mockListPriceLists(...args),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'Wave7CWrapper';
  return Wrapper;
}

describe('wave 7c suppliers and procurement reconciliation', () => {
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
    mockListPurchaseOrders.mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 },
    });
    mockGetReceivingDashboardSummary.mockResolvedValue({
      totalOrders: 0,
      overdueCount: 0,
      totalValue: 0,
      supplierCount: 0,
      oldestOrderDate: null,
    });
    mockGetPurchaseOrderStatusCounts.mockResolvedValue({
      all: 0,
      draft: 0,
      pending_approval: 0,
      ordered: 0,
      partially_received: 0,
      received: 0,
      cancelled: 0,
      closed: 0,
    });
    mockGetPurchaseOrder.mockResolvedValue({
      id: 'po-1',
      poNumber: 'PO-001',
      status: 'draft',
      totalAmount: 0,
      supplierId: 'supplier-1',
      supplierName: 'Northwind Supply',
      createdAt: new Date().toISOString(),
    });
  });

  it('treats supplier and purchase-order lists as healthy shaped empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useSuppliers, usePriceLists } = await import('@/hooks/suppliers/use-suppliers');
    const {
      usePurchaseOrders,
      usePendingApprovals,
      useReceivingDashboardSummary,
      usePurchaseOrderStatusCounts,
    } = await import('@/hooks/suppliers/use-purchase-orders');

    const suppliers = renderHook(() => useSuppliers(), { wrapper: createWrapper(queryClient) });
    const priceLists = renderHook(
      () => usePriceLists({ supplierId: 'supplier-1', page: 1, pageSize: 50 }),
      { wrapper: createWrapper(queryClient) }
    );
    const purchaseOrders = renderHook(() => usePurchaseOrders(), {
      wrapper: createWrapper(queryClient),
    });
    const pendingApprovals = renderHook(() => usePendingApprovals(), {
      wrapper: createWrapper(queryClient),
    });
    const receivingSummary = renderHook(() => useReceivingDashboardSummary(), {
      wrapper: createWrapper(queryClient),
    });
    const statusCounts = renderHook(() => usePurchaseOrderStatusCounts(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(suppliers.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(priceLists.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(purchaseOrders.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(pendingApprovals.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(receivingSummary.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(statusCounts.result.current.isSuccess).toBe(true));

    expect(suppliers.result.current.data?.items).toEqual([]);
    expect(priceLists.result.current.data?.items).toEqual([]);
    expect(purchaseOrders.result.current.data?.items).toEqual([]);
    expect(pendingApprovals.result.current.data?.items).toEqual([]);
    expect(receivingSummary.result.current.data?.totalOrders).toBe(0);
    expect(statusCounts.result.current.data?.all).toBe(0);
  });

  it('preserves not-found semantics for supplier and purchase-order detail reads', async () => {
    mockGetSupplier.mockRejectedValueOnce({
      message: 'Supplier not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });
    mockGetPurchaseOrder.mockRejectedValueOnce({
      message: 'Purchase order not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useSupplier } = await import('@/hooks/suppliers/use-suppliers');
    const { usePurchaseOrder } = await import('@/hooks/suppliers/use-purchase-orders');

    const supplier = renderHook(() => useSupplier('missing-supplier'), {
      wrapper: createWrapper(queryClient),
    });
    const purchaseOrder = renderHook(() => usePurchaseOrder('missing-po'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(supplier.result.current.error).toBeTruthy());
    await waitFor(() => expect(purchaseOrder.result.current.error).toBeTruthy());

    expect(supplier.result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
    });
    expect(purchaseOrder.result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
    });
  });

  it('keeps the receiving dashboard visible when summary metrics fail but stale purchase-order data remains', async () => {
    vi.resetModules();
    vi.doMock('@/hooks/suppliers', () => ({
      usePurchaseOrders: () => ({
        data: {
          items: [
            {
              id: 'po-1',
              poNumber: 'PO-001',
              status: 'ordered',
              totalAmount: 500,
              currency: 'AUD',
              createdAt: new Date().toISOString(),
            },
          ],
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      }),
      useReceivingDashboardSummary: () => ({
        data: undefined,
        isLoading: false,
        error: new Error('Receiving summary metrics are temporarily unavailable. Please refresh and try again.'),
      }),
    }));
    vi.doMock('@/hooks/suppliers/use-bulk-receive-goods', () => ({
      useBulkReceiveGoods: () => ({
        mutateAsync: vi.fn(),
        reset: vi.fn(),
        isPending: false,
        data: null,
      }),
    }));
    vi.doMock('@/components/shared/data-table', () => ({
      useTableSelection: () => ({
        selectedIds: new Set<string>(),
        selectedItems: [],
        isAllSelected: false,
        isPartiallySelected: false,
        handleSelect: vi.fn(),
        handleSelectAll: vi.fn(),
        handleShiftClickRange: vi.fn(),
        clearSelection: vi.fn(),
        isSelected: vi.fn(() => false),
      }),
    }));
    vi.doMock('@/components/domain/procurement/receiving/receiving-dashboard', () => ({
      ReceivingDashboard: ({
        summaryWarning,
      }: {
        summaryWarning?: string | null;
      }) => (
        <div>
          <div>receiving-dashboard</div>
          {summaryWarning ? <div>{summaryWarning}</div> : null}
        </div>
      ),
    }));
    vi.doMock('@/components/domain/procurement/receiving/bulk-receiving-dialog-container', () => ({
      BulkReceivingDialogContainer: () => null,
    }));

    const { ReceivingDashboardContainer } = await import(
      '@/components/domain/procurement/receiving/receiving-dashboard-container'
    );

    render(<ReceivingDashboardContainer />);

    expect(screen.getByText('receiving-dashboard')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Receiving summary metrics are temporarily unavailable. Headline cards are hidden where needed to avoid misleading values.'
      )
    ).toBeInTheDocument();
  });

  it('keeps the create-purchase-order flow visible when supplier lookups fail', async () => {
    vi.resetModules();
    vi.doMock('@tanstack/react-router', () => ({
      useNavigate: () => vi.fn(),
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
    vi.doMock('@/components/ui/button', () => ({
      Button: ({ children }: { children: ReactNode }) => <button>{children}</button>,
    }));
    vi.doMock('@/components/ui/alert', () => ({
      Alert: ({ children }: { children: ReactNode }) => <div>{children}</div>,
      AlertTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
      AlertDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    }));
    vi.doMock('@/components/domain/suppliers/po-creation-wizard', () => ({
      POCreationWizard: () => <div>po-creation-wizard</div>,
    }));
    vi.doMock('@/hooks/suppliers', () => ({
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
    vi.doMock('@/hooks/products', () => ({
      useProducts: () => ({
        data: { products: [] },
        isLoading: false,
        error: null,
      }),
      useProduct: () => ({
        data: null,
        isLoading: false,
        error: null,
      }),
    }));
    vi.doMock('@/hooks/suppliers/use-purchase-orders', () => ({
      useCreatePurchaseOrder: () => ({
        mutateAsync: vi.fn(),
        isPending: false,
      }),
    }));
    vi.doMock('@/hooks', () => ({
      toast: {
        success: vi.fn(),
        error: vi.fn(),
      },
    }));
    vi.doMock('@/lib/logger', () => ({
      logger: {
        error: vi.fn(),
      },
    }));

    const { default: PurchaseOrderCreatePage } = await import(
      '@/routes/_authenticated/purchase-orders/-create-page'
    );

    render(<PurchaseOrderCreatePage search={{}} />);

    expect(screen.getByText('Supplier list unavailable')).toBeInTheDocument();
    expect(screen.getByText('Preferred supplier pricing unavailable')).toBeInTheDocument();
    expect(screen.getByText('po-creation-wizard')).toBeInTheDocument();
  });
});
