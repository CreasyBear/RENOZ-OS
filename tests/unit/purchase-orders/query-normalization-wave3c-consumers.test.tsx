import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUsePurchaseOrders = vi.fn();
const mockUsePurchaseOrderStatusCounts = vi.fn();
const mockUseDeletePurchaseOrder = vi.fn();
const mockUseBulkDeletePurchaseOrders = vi.fn();
const mockUseBulkReceiveGoods = vi.fn();
const mockUseBulkApprove = vi.fn();
const mockUseReceivingDashboardSummary = vi.fn();
const mockUseBulkReceiveHook = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

vi.mock('@/hooks', () => ({
  useConfirmation: () => ({
    confirm: vi.fn(),
  }),
}));

vi.mock('@/hooks/filters/use-filter-url-state', () => ({
  useTransformedFilterUrlState: () => ({
    filters: {
      search: '',
      status: [],
      supplierId: null,
      dateRange: null,
      totalRange: null,
      overdue: false,
    },
    setFilters: vi.fn(),
  }),
  parseDateFromUrl: vi.fn(),
  serializeDateForUrl: vi.fn(),
}));

vi.mock('@/hooks/purchase-orders/use-receiving-dialog', () => ({
  useReceivingDialog: () => ({
    isOpen: false,
    selectedPOId: null,
    onOpenChange: vi.fn(),
    openDialog: vi.fn(),
  }),
}));

vi.mock('@/hooks/suppliers/use-approvals', () => ({
  useBulkApprove: () => mockUseBulkApprove(),
}));

vi.mock('@/server/functions/suppliers/approvals', () => ({
  getApprovalIdsForPurchaseOrders: vi.fn(),
}));

vi.mock('@/components/layout', () => ({
  PageLayout: Object.assign(
    ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    {
      Header: ({ title, description }: { title: React.ReactNode; description?: React.ReactNode }) => (
        <div>
          <div>{title}</div>
          {description ? <div>{description}</div> : null}
        </div>
      ),
      Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    }
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode; className?: string }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/domain/purchase-orders', () => ({
  PODirectory: ({
    error,
    statusCounts,
  }: {
    error?: Error | null;
    statusCounts?: Record<string, number> | null;
  }) => (
    <div>
      po-directory
      {error ? <span>orders-error</span> : null}
      {statusCounts ? <span>status-counts-loaded</span> : null}
    </div>
  ),
  DEFAULT_PO_FILTERS: {
    search: '',
    status: [],
    supplierId: null,
    dateRange: null,
    totalRange: null,
    overdue: false,
  },
  buildPOQuery: () => ({}),
}));

vi.mock('@/components/domain/purchase-orders/receive/receiving-dialog-wrapper', () => ({
  ReceivingDialogWrapper: () => <div>receiving-dialog</div>,
}));

vi.mock('@/components/domain/procurement/receiving/bulk-receiving-dialog-container', () => ({
  BulkReceivingDialogContainer: () => <div>bulk-receiving-dialog</div>,
}));

vi.mock('@/components/shared/data-table', () => ({
  BulkActionsBar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

vi.mock('@/components/domain/procurement/receiving/receiving-dashboard', () => ({
  ReceivingDashboard: ({
    orders,
    summaryWarning,
  }: {
    orders: Array<{ id: string }>;
    summaryWarning?: string | null;
  }) => (
    <div>
      <span>receiving-orders:{orders.length}</span>
      {summaryWarning ? <span>{summaryWarning}</span> : null}
    </div>
  ),
}));

vi.mock('@/components/domain/procurement/receiving/receiving-metrics', () => ({
  buildReceivingMetrics: ({
    receivingSummary,
    ordersData,
    summaryState,
  }: {
    receivingSummary?: { totalOrders?: number; totalValue?: number; supplierCount?: number; oldestOrderDate?: string | null } | null;
    ordersData?: { items?: unknown[] } | null;
    summaryState: string;
  }) => ({
    totalOrders: receivingSummary?.totalOrders ?? ordersData?.items?.length ?? 0,
    totalValue: receivingSummary?.totalValue ?? 0,
    supplierCount: receivingSummary?.supplierCount ?? 0,
    oldestOrderDate: receivingSummary?.oldestOrderDate ?? null,
    summaryState,
  }),
}));

vi.mock('@/hooks/suppliers/use-bulk-receive-goods', () => ({
  useBulkReceiveGoods: () => mockUseBulkReceiveHook(),
}));

vi.mock('@/hooks/suppliers', async () => {
  const actual = await vi.importActual<object>('@/hooks/suppliers');
  return {
    ...actual,
    usePurchaseOrders: (...args: unknown[]) => mockUsePurchaseOrders(...args),
    useReceivingDashboardSummary: () => mockUseReceivingDashboardSummary(),
    usePurchaseOrderStatusCounts: () => mockUsePurchaseOrderStatusCounts(),
    useDeletePurchaseOrder: () => mockUseDeletePurchaseOrder(),
    useBulkDeletePurchaseOrders: () => mockUseBulkDeletePurchaseOrders(),
  };
});

describe('purchase-order consumer normalization wave 3c', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePurchaseOrders.mockReturnValue({
      data: {
        items: [
          {
            id: 'po-1',
            poNumber: 'PO-100',
            supplierId: 'supplier-1',
            supplierName: 'Northwind Supply',
            status: 'ordered',
            orderDate: '2026-04-01',
            requiredDate: '2026-04-10',
            expectedDeliveryDate: '2026-04-12',
            totalAmount: 100,
            currency: 'AUD',
            createdAt: '2026-04-01T00:00:00.000Z',
            updatedAt: '2026-04-01T00:00:00.000Z',
          },
        ],
        pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUsePurchaseOrderStatusCounts.mockReturnValue({
      data: null,
      error: new Error('Purchase order status counts are temporarily unavailable. Please refresh and try again.'),
    });
    mockUseDeletePurchaseOrder.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    });
    mockUseBulkDeletePurchaseOrders.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    mockUseBulkReceiveGoods.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
      data: null,
    });
    mockUseBulkApprove.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    mockUseReceivingDashboardSummary.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Receiving summary metrics are temporarily unavailable. Please refresh and try again.'),
    });
    mockUseBulkReceiveHook.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
      reset: vi.fn(),
      data: null,
    });
  });

  it('shows a non-blocking warning when purchase-order status counts fail', async () => {
    const PurchaseOrdersPage = (await import('@/routes/_authenticated/purchase-orders/purchase-orders-page')).default;

    render(
      <PurchaseOrdersPage
        search={{
          page: 1,
          pageSize: 20,
          search: '',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }}
      />
    );

    expect(screen.getByText('Status counts unavailable')).toBeInTheDocument();
    expect(screen.getByText('po-directory')).toBeInTheDocument();
  });

  it('keeps receiving rows visible with a degraded summary warning when summary metrics fail', async () => {
    const { ReceivingDashboardContainer } = await import(
      '@/components/domain/procurement/receiving/receiving-dashboard-container'
    );

    render(<ReceivingDashboardContainer />);

    expect(screen.getByText('receiving-orders:1')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Receiving summary metrics are temporarily unavailable. Headline cards are hidden where needed to avoid misleading values.'
      )
    ).toBeInTheDocument();
  });
});
