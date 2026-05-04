import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListPurchaseOrderReceipts = vi.fn();
const mockReceiveGoods = vi.fn();
const mockGetPurchaseOrderCosts = vi.fn();
const mockAddPurchaseOrderCost = vi.fn();
const mockUpdatePurchaseOrderCost = vi.fn();
const mockDeletePurchaseOrderCost = vi.fn();
const mockCalculateAllocatedCosts = vi.fn();
const mockGetPurchaseOrder = vi.fn();

vi.mock('@/server/functions/suppliers', () => ({
  listPurchaseOrderReceipts: (...args: unknown[]) => mockListPurchaseOrderReceipts(...args),
  receiveGoods: (...args: unknown[]) => mockReceiveGoods(...args),
  getPurchaseOrderCosts: (...args: unknown[]) => mockGetPurchaseOrderCosts(...args),
  addPurchaseOrderCost: (...args: unknown[]) => mockAddPurchaseOrderCost(...args),
  updatePurchaseOrderCost: (...args: unknown[]) => mockUpdatePurchaseOrderCost(...args),
  deletePurchaseOrderCost: (...args: unknown[]) => mockDeletePurchaseOrderCost(...args),
  calculateAllocatedCosts: (...args: unknown[]) => mockCalculateAllocatedCosts(...args),
}));

vi.mock('@/server/functions/suppliers/purchase-orders', () => ({
  getPurchaseOrder: (...args: unknown[]) => mockGetPurchaseOrder(...args),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'PurchaseOrdersQueryNormalizationWave3DWrapper';
  return Wrapper;
}

describe('purchase-order query normalization wave 3d', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockListPurchaseOrderReceipts.mockResolvedValue({
      receipts: [],
    });
    mockGetPurchaseOrderCosts.mockResolvedValue({
      costs: [],
      totalCosts: 0,
    });
    mockCalculateAllocatedCosts.mockResolvedValue({
      items: [],
      summary: {
        totalPOValue: 0,
        totalAdditionalCosts: 0,
        totalLandedCost: 0,
      },
    });
    mockGetPurchaseOrder.mockResolvedValue({
      id: 'po-1',
      poNumber: 'PO-100',
      status: 'ordered',
      items: [],
    });
  });

  it('treats purchase-order receipts as always-shaped and accepts empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { usePurchaseOrderReceipts } = await import('@/hooks/suppliers/use-goods-receipt');

    const { result } = renderHook(() => usePurchaseOrderReceipts('po-1'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ receipts: [] });
  });

  it('normalizes purchase-order cost failures as always-shaped system errors', async () => {
    mockGetPurchaseOrderCosts.mockRejectedValueOnce({
      message: 'HTTPError',
      statusCode: 503,
      code: 'INTERNAL_ERROR',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { usePurchaseOrderCosts } = await import('@/hooks/suppliers/use-po-costs');

    const { result } = renderHook(() => usePurchaseOrderCosts('po-1'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'system',
      contractType: 'always-shaped',
      message: 'Purchase order costs are temporarily unavailable. Please refresh and try again.',
    });
  });

  it('preserves validation semantics for allocated-cost reads', async () => {
    mockCalculateAllocatedCosts.mockRejectedValueOnce({
      message:
        'Purchase order currency (USD) differs from organization currency (AUD). Set exchange rate on the purchase order to view landed cost.',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useAllocatedCosts } = await import('@/hooks/suppliers/use-po-costs');

    const { result } = renderHook(() => useAllocatedCosts('po-1'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'validation',
      contractType: 'detail-not-found',
      message:
        'Purchase order currency (USD) differs from organization currency (AUD). Set exchange rate on the purchase order to view landed cost.',
    });
  });

  it('preserves not-found semantics for allocated-cost reads', async () => {
    mockCalculateAllocatedCosts.mockRejectedValueOnce({
      message: 'Purchase order not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useAllocatedCosts } = await import('@/hooks/suppliers/use-po-costs');

    const { result } = renderHook(() => useAllocatedCosts('missing-po'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested purchase order could not be found.',
    });
  });

  it('preserves not-found semantics across bulk purchase-order fanout', async () => {
    mockGetPurchaseOrder.mockRejectedValueOnce({
      message: 'Purchase order not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useBulkPurchaseOrders } = await import('@/hooks/suppliers/use-bulk-purchase-orders');

    const { result } = renderHook(
      () =>
        useBulkPurchaseOrders({
          purchaseOrderIds: ['missing-po'],
        }),
      {
        wrapper: createWrapper(queryClient),
      }
    );

    await waitFor(() => expect(result.current.hasErrors).toBe(true));
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0]?.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested purchase order could not be found.',
    });
  });
});
