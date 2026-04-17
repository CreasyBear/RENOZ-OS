import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseServerFn = vi.fn((fn: unknown) => fn);
const mockListOrders = vi.fn();
const mockGetOrder = vi.fn();
const mockGetOrderWithCustomer = vi.fn();
const mockGetOrderStats = vi.fn();
const mockGetFulfillmentDashboardSummary = vi.fn();

vi.mock('@tanstack/react-start', async () => {
  const actual = await vi.importActual<object>('@tanstack/react-start');
  return {
    ...actual,
    useServerFn: (fn: unknown) => mockUseServerFn(fn),
  };
});

vi.mock('@/server/functions/orders/orders', () => ({
  listOrders: (...args: unknown[]) => mockListOrders(...args),
  getOrder: (...args: unknown[]) => mockGetOrder(...args),
  getOrderWithCustomer: (...args: unknown[]) => mockGetOrderWithCustomer(...args),
  getOrderStats: (...args: unknown[]) => mockGetOrderStats(...args),
  getFulfillmentDashboardSummary: (...args: unknown[]) =>
    mockGetFulfillmentDashboardSummary(...args),
  createOrder: vi.fn(),
  updateOrder: vi.fn(),
  deleteOrder: vi.fn(),
  duplicateOrder: vi.fn(),
  addOrderLineItem: vi.fn(),
  updateOrderLineItem: vi.fn(),
  deleteOrderLineItem: vi.fn(),
  updateOrderStatus: vi.fn(),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'OrdersQueryNormalizationWave2Wrapper';
  return Wrapper;
}

describe('orders query normalization wave 2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListOrders.mockResolvedValue({
      orders: [],
      total: 0,
      page: 1,
      limit: 20,
      hasMore: false,
    });
    mockGetOrder.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'SO-100',
      lineItems: [],
    });
    mockGetOrderWithCustomer.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'SO-100',
      customer: null,
      lineItems: [],
    });
    mockGetOrderStats.mockResolvedValue({
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      unpaidOrders: 0,
      draftOrders: 0,
    });
    mockGetFulfillmentDashboardSummary.mockResolvedValue({
      toPick: 0,
      readyToShip: 0,
      overdue: 0,
      inTransit: 0,
    });
  });

  it('treats order lists as always-shaped and accepts empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useOrders } = await import('@/hooks/orders/use-orders');

    const { result } = renderHook(() => useOrders(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      orders: [],
      total: 0,
    });
  });

  it('treats fulfillment summary as always-shaped and accepts zero-value success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useFulfillmentDashboardSummary } = await import('@/hooks/orders/use-orders');

    const { result } = renderHook(() => useFulfillmentDashboardSummary(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      toPick: 0,
      readyToShip: 0,
      overdue: 0,
      inTransit: 0,
    });
  });

  it('preserves not-found semantics for order detail reads', async () => {
    mockGetOrder.mockRejectedValueOnce({
      message: 'Order not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useOrder } = await import('@/hooks/orders/use-orders');

    const { result } = renderHook(() => useOrder({ orderId: 'missing-order' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested order could not be found.',
    });
  });

  it('preserves not-found semantics for order-with-customer reads', async () => {
    mockGetOrderWithCustomer.mockRejectedValueOnce({
      message: 'Order not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useOrderWithCustomer } = await import('@/hooks/orders/use-order-detail');

    const { result } = renderHook(() => useOrderWithCustomer({ orderId: 'missing-order' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested order could not be found.',
    });
  });

  it('normalizes fulfillment summary failures as system errors', async () => {
    mockGetFulfillmentDashboardSummary.mockRejectedValueOnce({
      message: 'HTTPError',
      statusCode: 503,
      code: 'INTERNAL_ERROR',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useFulfillmentDashboardSummary } = await import('@/hooks/orders/use-orders');

    const { result } = renderHook(() => useFulfillmentDashboardSummary(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'system',
      contractType: 'always-shaped',
      message: 'Fulfillment metrics are temporarily unavailable. Please refresh and try again.',
    });
  });
});
