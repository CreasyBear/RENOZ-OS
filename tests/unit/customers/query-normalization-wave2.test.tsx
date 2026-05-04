import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CustomerDetailData } from '@/lib/schemas/customers';

const mockUseServerFn = vi.fn((fn: unknown) => fn);
const mockGetCustomerAlerts = vi.fn();
const mockGetCustomerActiveItems = vi.fn();
const mockGetCustomerOrderSummary = vi.fn();
const mockGetCustomerTriage = vi.fn();
const mockDetectDuplicates = vi.fn();

vi.mock('@tanstack/react-start', async () => {
  const actual = await vi.importActual<object>('@tanstack/react-start');
  return {
    ...actual,
    useServerFn: (fn: unknown) => mockUseServerFn(fn),
  };
});

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock('@/server/functions/customers/customer-detail-extended', () => ({
  getCustomerAlerts: (...args: unknown[]) => mockGetCustomerAlerts(...args),
  getCustomerActiveItems: (...args: unknown[]) => mockGetCustomerActiveItems(...args),
  getCustomerOrderSummary: (...args: unknown[]) => mockGetCustomerOrderSummary(...args),
}));

vi.mock('@/server/functions/customers/customer-triage', () => ({
  getCustomerTriage: (...args: unknown[]) => mockGetCustomerTriage(...args),
}));

vi.mock('@/server/functions/customers/customer-duplicates', () => ({
  detectDuplicates: (...args: unknown[]) => mockDetectDuplicates(...args),
}));

vi.mock('@/components/domain/customers/containers/customer-hierarchy-container', () => ({
  CustomerHierarchyContainer: () => <div>Hierarchy stub</div>,
}));

vi.mock('@/components/shared/format', () => ({
  FormatAmount: ({ amount }: { amount: number }) => <span>{amount}</span>,
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'CustomerQueryNormalizationWave2Wrapper';
  return Wrapper;
}

const baseCustomer: CustomerDetailData = {
  id: 'customer-1',
  name: 'Acme Corp',
  customerCode: 'CUST-001',
  status: 'active',
  type: 'business',
  totalOrders: 0,
  creditHold: false,
  tags: [],
  contacts: [],
  addresses: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('customer query normalization wave 2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCustomerAlerts.mockResolvedValue({
      alerts: [],
      hasAlerts: false,
      criticalCount: 0,
      warningCount: 0,
    });
    mockGetCustomerActiveItems.mockResolvedValue({
      quotes: [],
      orders: [],
      projects: [],
      claims: [],
      counts: {
        quotes: 0,
        orders: 0,
        projects: 0,
        claims: 0,
      },
    });
    mockGetCustomerOrderSummary.mockResolvedValue({
      totalOrders: 0,
      totalValue: 0,
      outstandingBalance: 0,
      averageOrderValue: 0,
      recentOrders: [],
      ordersByStatus: [],
    });
    mockGetCustomerTriage.mockResolvedValue({
      creditHolds: [],
      lowHealthScores: [],
    });
    mockDetectDuplicates.mockResolvedValue({
      duplicates: [],
      hasMore: false,
    });
  });

  it('treats customer order summary as always-shaped and accepts zero-value success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useCustomerOrderSummary } = await import('@/hooks/customers/use-customer-detail-extended');

    const { result } = renderHook(() => useCustomerOrderSummary({ customerId: 'customer-1' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      totalOrders: 0,
      recentOrders: [],
    });
  });

  it('normalizes thrown customer order summary failures as system errors', async () => {
    mockGetCustomerOrderSummary.mockRejectedValueOnce({
      message: 'HTTPError',
      statusCode: 503,
      code: 'INTERNAL_ERROR',
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useCustomerOrderSummary } = await import('@/hooks/customers/use-customer-detail-extended');

    const { result } = renderHook(() => useCustomerOrderSummary({ customerId: 'customer-1' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error).toMatchObject({
      failureKind: 'system',
      contractType: 'always-shaped',
      message: 'Customer order metrics are temporarily unavailable. Please refresh and try again.',
    });
  });

  it('shows an unavailable state instead of a fake empty state on the orders tab', async () => {
    const { CustomerOrdersTab } = await import('@/components/domain/customers/tabs/customer-orders-tab');

    render(
      <CustomerOrdersTab
        orderSummary={undefined}
        totalOrders={0}
        customerId="customer-1"
        orderSummaryState="unavailable"
      />
    );

    expect(screen.getByText(/Recent order history is temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/No orders yet/i)).not.toBeInTheDocument();
  });

  it('shows an unavailable recent-orders state on the overview tab when the summary query fails', async () => {
    const { CustomerOverviewTab } = await import('@/components/domain/customers/tabs/customer-overview-tab');

    render(
      <CustomerOverviewTab
        customer={baseCustomer}
        activeItems={undefined}
        activeItemsLoading={false}
        orderSummaryState="unavailable"
      />
    );

    expect(screen.getByText(/Recent orders are temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/No orders yet/i)).not.toBeInTheDocument();
  });

  it('builds an unavailable display policy for headline customer order metrics', async () => {
    const { getCustomerOrderSummaryDisplayPolicy } = await import('@/lib/customer-order-summary-display');

    expect(
      getCustomerOrderSummaryDisplayPolicy({
        orderSummaryState: 'unavailable',
        lifetimeValue: 12345,
        totalOrders: 7,
      })
    ).toEqual({
      orderSummaryUnavailable: true,
      lifetimeValueDisplay: '--',
      totalOrdersDisplay: '--',
      ordersTabLabel: 'Orders',
      metricSubtitle: 'Temporarily unavailable',
    });
  });

  it('treats customer triage as always-shaped and accepts empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useCustomerTriage } = await import('@/hooks/customers/use-customer-triage');

    const { result } = renderHook(() => useCustomerTriage(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      creditHolds: [],
      lowHealthScores: [],
    });
  });

  it('treats duplicate detection as always-shaped and preserves empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useDuplicateDetection } = await import('@/hooks/customers/use-duplicate-detection');

    const { result } = renderHook(() => useDuplicateDetection({ debounceMs: 0 }), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.checkForDuplicates({ name: 'Acme' });
    });

    await waitFor(() => expect(mockDetectDuplicates).toHaveBeenCalled());
    await waitFor(() => expect(result.current.duplicates).toEqual([]));
    expect(result.current.error).toBeNull();
  });
});
