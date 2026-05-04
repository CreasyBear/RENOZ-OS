import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CUSTOMER_FILTERS } from '@/components/domain/customers/customer-filter-config';

const mockGetCustomers = vi.fn();
const mockGetCustomerById = vi.fn();
const mockListOpportunities = vi.fn();
const mockGetOpportunity = vi.fn();
const mockGetPipelineMetrics = vi.fn();

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: vi.fn() };
  },
}));

vi.mock('@tanstack/react-start', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-start')>('@tanstack/react-start');
  return { ...actual, useServerFn: (fn: unknown) => fn };
});

vi.mock('@/server/functions/customers/customers', () => ({
  getCustomers: (...args: unknown[]) => mockGetCustomers(...args),
  getCustomerById: (...args: unknown[]) => mockGetCustomerById(...args),
  getCustomerTags: vi.fn().mockResolvedValue([]),
  createCustomer: vi.fn(),
  createCustomerBundle: vi.fn(),
  updateCustomer: vi.fn(),
  updateCustomerBundle: vi.fn(),
  deleteCustomer: vi.fn(),
  bulkDeleteCustomers: vi.fn(),
  bulkUpdateCustomers: vi.fn(),
  bulkAssignTags: vi.fn(),
  bulkUpdateHealthScores: vi.fn(),
  deleteCustomerTag: vi.fn(),
}));

vi.mock('@/server/functions/financial/xero-operations', () => ({
  getCustomerXeroMappingStatus: vi.fn().mockResolvedValue({}),
  searchCustomerXeroContacts: vi.fn().mockResolvedValue([]),
  createCustomerXeroContact: vi.fn(),
  linkCustomerXeroContact: vi.fn(),
  unlinkCustomerXeroContact: vi.fn(),
}));

vi.mock('@/components/domain/customers/customer-sorting', () => ({
  isValidCustomerSortField: () => true,
  DEFAULT_CUSTOMER_SORT_FIELD: 'createdAt',
  DEFAULT_CUSTOMER_SORT_DIRECTION: 'desc',
  resolveCustomerSortState: () => ({ field: 'createdAt', direction: 'desc' }),
}));

vi.mock('@/server/functions/pipeline/pipeline', () => ({
  listOpportunities: (...args: unknown[]) => mockListOpportunities(...args),
  getOpportunity: (...args: unknown[]) => mockGetOpportunity(...args),
  getPipelineMetrics: (...args: unknown[]) => mockGetPipelineMetrics(...args),
  getPipelineForecast: vi.fn().mockResolvedValue([]),
  getPipelineVelocity: vi.fn().mockResolvedValue([]),
  getRevenueAttribution: vi.fn().mockResolvedValue([]),
  deleteQuote: vi.fn(),
  listActivities: vi.fn().mockResolvedValue([]),
  getActivityTimeline: vi.fn().mockResolvedValue([]),
  getUpcomingFollowUps: vi.fn().mockResolvedValue({ overdue: [], upcoming: [] }),
  getActivityAnalytics: vi.fn().mockResolvedValue([]),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'Wave6EWrapper';
  return Wrapper;
}

describe('wave 6e customers/pipeline normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCustomers.mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 },
    });
    mockGetCustomerById.mockResolvedValue({
      id: 'customer-1',
      name: 'Acme',
      customerType: 'residential',
      status: 'active',
    });
    mockListOpportunities.mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 },
    });
    mockGetOpportunity.mockResolvedValue({ id: 'opp-1', title: 'Solar upgrade' });
    mockGetPipelineMetrics.mockResolvedValue({
      totalValue: 0,
      weightedValue: 0,
      opportunityCount: 0,
      byStage: {},
      avgDaysInStage: {},
      conversionRate: 0,
    });
  });

  it('treats customer/opportunity lists and analytics as healthy shaped empty success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useCustomers } = await import('@/hooks/customers/use-customers');
    const { useOpportunities } = await import('@/hooks/pipeline/use-opportunities');
    const { usePipelineMetrics } = await import('@/hooks/pipeline/use-pipeline-metrics');

    const customers = renderHook(() => useCustomers(), { wrapper: createWrapper(queryClient) });
    const opportunities = renderHook(() => useOpportunities(), {
      wrapper: createWrapper(queryClient),
    });
    const metrics = renderHook(() => usePipelineMetrics(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(customers.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(opportunities.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(metrics.result.current.isSuccess).toBe(true));

    expect(customers.result.current.data?.items).toEqual([]);
    expect(opportunities.result.current.data?.items).toEqual([]);
    expect(metrics.result.current.data?.opportunityCount).toBe(0);
  });

  it('preserves not-found semantics for customer and opportunity detail reads', async () => {
    mockGetCustomerById.mockRejectedValueOnce({
      message: 'Customer not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    });
    mockGetOpportunity.mockRejectedValueOnce({
      message: 'Opportunity not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useCustomer } = await import('@/hooks/customers/use-customers');
    const { useOpportunity } = await import('@/hooks/pipeline/use-opportunities');

    const customer = renderHook(() => useCustomer({ id: 'missing-customer' }), {
      wrapper: createWrapper(queryClient),
    });
    const opportunity = renderHook(() => useOpportunity({ id: 'missing-opp' }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(customer.result.current.error).toBeTruthy());
    await waitFor(() => expect(opportunity.result.current.error).toBeTruthy());

    expect(customer.result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
    });
    expect(opportunity.result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
    });
  });

  it(
    'shows degraded copy in customer and opportunity headline containers when stale rows remain visible',
    async () => {
    vi.resetModules();

    vi.doMock('@/hooks/customers', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@/hooks/customers')>();
      return {
        ...actual,
        useCustomerNavigation: () => ({
          navigateToCustomer: vi.fn(),
          navigateToEdit: vi.fn(),
        }),
        useCustomers: () => ({
          data: {
            items: [
              {
                id: 'customer-1',
                name: 'Acme',
                email: 'ops@acme.test',
                phone: null,
                status: 'active',
                healthScore: 80,
              },
            ],
            pagination: { page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
          },
          isLoading: false,
          error: new Error('Customers are temporarily unavailable. Please refresh and try again.'),
        }),
        useDeleteCustomer: () => ({ mutateAsync: vi.fn() }),
        useBulkDeleteCustomers: () => ({ mutateAsync: vi.fn() }),
        useBulkUpdateCustomers: () => ({ mutateAsync: vi.fn() }),
        useBulkAssignCustomerTags: () => ({ mutateAsync: vi.fn() }),
        useBulkUpdateHealthScores: () => ({ mutateAsync: vi.fn() }),
        useSavedCustomerFilters: () => ({
          savedFilters: [],
          isLoading: false,
          error: null,
          saveFilter: vi.fn(),
          updateFilter: vi.fn(),
          deleteFilter: vi.fn(),
        }),
        useRecentBulkOperations: () => ({ data: [] }),
        useRollbackBulkOperation: () => ({ mutateAsync: vi.fn() }),
        useCustomerKpis: () => ({
          data: {
            kpis: [
              { value: '1', changeLabel: 'stable', change: 0 },
              { value: '$0', changeLabel: 'stable', change: 0 },
              { value: '0%', changeLabel: 'stable', change: 0 },
              { value: '0', changeLabel: 'stable', change: 0 },
            ],
          },
          isLoading: false,
          error: null,
        }),
      };
    });
    vi.doMock('@/hooks/pipeline', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@/hooks/pipeline')>();
      return {
        ...actual,
        useOpportunities: () => ({
          data: {
            items: [{ id: 'opp-1', title: 'Solar upgrade', stage: 'proposal' }],
            pagination: { page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
          },
          isLoading: false,
          error: new Error('Opportunities are temporarily unavailable. Please refresh and try again.'),
        }),
        useDeleteOpportunity: () => ({ mutateAsync: vi.fn() }),
        useBulkUpdateOpportunityStage: () => ({ mutateAsync: vi.fn() }),
      };
    });
    vi.doMock('@/components/domain/customers/customers-list-presenter', () => ({
      CustomersListPresenter: () => <div>customers presenter</div>,
    }));
    vi.doMock('@/components/domain/pipeline/opportunities/opportunities-list-presenter', () => ({
      OpportunitiesListPresenter: () => <div>opportunities presenter</div>,
    }));
    vi.doMock('@/components/shared/data-table', () => ({
      BulkActionsBar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      useTableSelection: () => ({
        selectedIds: new Set<string>(),
        selectedItems: [],
        isAllSelected: false,
        isPartiallySelected: false,
        lastClickedIndex: null,
        setLastClickedIndex: vi.fn(),
        handleSelect: vi.fn(),
        handleSelectAll: vi.fn(),
        handleShiftClickRange: vi.fn(),
        clearSelection: vi.fn(),
        isSelected: vi.fn(() => false),
      }),
    }));
    vi.doMock('@/components/shared/format', () => ({
      FormatAmount: ({ amount }: { amount?: number }) => <span>{amount ?? 0}</span>,
    }));
    vi.doMock('@tanstack/react-router', () => ({
      useNavigate: () => vi.fn(),
    }));
    vi.doMock('@/hooks', () => ({
      toastSuccess: vi.fn(),
      toastError: vi.fn(),
      useConfirmation: () => ({ confirm: vi.fn().mockResolvedValue({ confirmed: false }) }),
    }));
    vi.doMock('@/hooks/_shared/use-confirmation', () => ({
      useConfirmation: () => ({ confirm: vi.fn().mockResolvedValue({ confirmed: false }) }),
      confirmations: { delete: () => ({ title: 'delete' }) },
    }));

    const { CustomersListContainer } = await import('@/components/domain/customers/customers-list-container');
    const { OpportunitiesListContainer } = await import(
      '@/components/domain/pipeline/opportunities/opportunities-list-container'
    );

    render(
      <>
        <CustomersListContainer
          filters={DEFAULT_CUSTOMER_FILTERS}
          onFiltersChange={vi.fn()}
        />
        <OpportunitiesListContainer />
      </>
    );

      expect(screen.getByText('Showing cached customers')).toBeInTheDocument();
      expect(screen.getByText('Showing cached opportunities')).toBeInTheDocument();
    },
    20000
  );
});
