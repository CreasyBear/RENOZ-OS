import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListPurchaseOrders = vi.fn();
const mockGetReceivingDashboardSummary = vi.fn();
const mockGetPurchaseOrderStatusCounts = vi.fn();
const mockGetPurchaseOrder = vi.fn();

vi.mock('@/server/functions/suppliers', () => ({
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

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'PurchaseOrdersQueryNormalizationWave3CWrapper';
  return Wrapper;
}

describe('purchase-order query normalization wave 3c', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPurchaseOrders.mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });
    mockGetReceivingDashboardSummary.mockResolvedValue({
      totalOrders: 0,
      totalValue: 0,
      supplierCount: 0,
      oldestOrderDate: null,
    });
    mockGetPurchaseOrderStatusCounts.mockResolvedValue({
      all: 0,
      pending_approval: 0,
      partial_received: 0,
      overdue: 0,
    });
    mockGetPurchaseOrder.mockResolvedValue({
      id: 'po-1',
      poNumber: 'PO-100',
      status: 'draft',
      supplierName: 'Northwind Supply',
      items: [],
    });
  });

  it('treats purchase-order list as always-shaped and accepts empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { usePurchaseOrders } = await import('@/hooks/suppliers/use-purchase-orders');

    const { result } = renderHook(() => usePurchaseOrders(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      items: [],
      pagination: { totalItems: 0 },
    });
  });

  it('normalizes purchase-order status count failures as always-shaped system errors', async () => {
    mockGetPurchaseOrderStatusCounts.mockRejectedValueOnce({
      message: 'HTTPError',
      statusCode: 503,
      code: 'INTERNAL_ERROR',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { usePurchaseOrderStatusCounts } = await import('@/hooks/suppliers/use-purchase-orders');

    const { result } = renderHook(() => usePurchaseOrderStatusCounts(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'system',
      contractType: 'always-shaped',
      message: 'Purchase order status counts are temporarily unavailable. Please refresh and try again.',
    });
  });

  it('normalizes receiving summary failures as always-shaped system errors', async () => {
    mockGetReceivingDashboardSummary.mockRejectedValueOnce({
      message: 'HTTPError',
      statusCode: 503,
      code: 'INTERNAL_ERROR',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useReceivingDashboardSummary } = await import('@/hooks/suppliers/use-purchase-orders');

    const { result } = renderHook(() => useReceivingDashboardSummary(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'system',
      contractType: 'always-shaped',
      message: 'Receiving summary metrics are temporarily unavailable. Please refresh and try again.',
    });
  });

  it('preserves not-found semantics for purchase-order detail reads', async () => {
    mockGetPurchaseOrder.mockRejectedValueOnce({
      message: 'Purchase order not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { usePurchaseOrder } = await import('@/hooks/suppliers/use-purchase-orders');

    const { result } = renderHook(() => usePurchaseOrder('missing-po'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested purchase order could not be found.',
    });
  });
});
