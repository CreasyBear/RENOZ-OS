import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetInvoices = vi.fn();
const mockGetInvoice = vi.fn();
const mockGetInvoiceSummary = vi.fn();
const mockListPortalOrders = vi.fn();
const mockListPortalJobs = vi.fn();
const mockListPortalQuotes = vi.fn();
const mockGetDocumentStatus = vi.fn();

vi.mock('@tanstack/react-start', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-start')>('@tanstack/react-start');
  return {
    ...actual,
    useServerFn: (fn: unknown) => fn,
  };
});

vi.mock('@/server/functions/invoices', () => ({
  getInvoices: (...args: unknown[]) => mockGetInvoices(...args),
  getInvoice: (...args: unknown[]) => mockGetInvoice(...args),
  getInvoiceSummary: (...args: unknown[]) => mockGetInvoiceSummary(...args),
  voidInvoice: vi.fn(),
}));

vi.mock('@/server/functions/portal/portal-read', () => ({
  listPortalOrders: (...args: unknown[]) => mockListPortalOrders(...args),
  listPortalJobs: (...args: unknown[]) => mockListPortalJobs(...args),
  listPortalQuotes: (...args: unknown[]) => mockListPortalQuotes(...args),
}));

vi.mock('@/server/functions/documents', () => ({
  generateQuotePdf: vi.fn(),
  generateInvoicePdf: vi.fn(),
  getDocumentStatus: (...args: unknown[]) => mockGetDocumentStatus(...args),
}));

function createWrapper(queryClient: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'FinanceQueryNormalizationWave5DWrapper';
  return Wrapper;
}

describe('finance/portal/document query normalization wave 5d', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 're_test_key';

    mockGetInvoices.mockResolvedValue({
      invoices: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false,
    });
    mockGetInvoice.mockResolvedValue({
      id: 'invoice-1',
      orderNumber: 'ORD-100',
      invoiceNumber: 'INV-100',
      invoiceStatus: 'unpaid',
      invoiceDueDate: null,
      invoiceSentAt: null,
      invoiceViewedAt: null,
      invoiceReminderSentAt: null,
      paidAt: null,
      status: 'draft',
      paymentStatus: 'pending',
      orderDate: null,
      dueDate: null,
      shippedDate: null,
      deliveredDate: null,
      subtotal: 100,
      discountAmount: 0,
      discountPercent: 0,
      taxAmount: 0,
      shippingAmount: 0,
      total: 100,
      paidAmount: 0,
      balanceDue: 100,
      internalNotes: null,
      customerNotes: null,
      invoicePdfUrl: null,
      createdAt: new Date('2026-04-20T00:00:00.000Z'),
      updatedAt: new Date('2026-04-20T00:00:00.000Z'),
      customer: {
        id: 'customer-1',
        name: 'Acme Corp',
        email: 'hello@acme.test',
        phone: null,
      },
      billingAddress: null,
      shippingAddress: null,
      lineItems: [],
    });
    mockGetInvoiceSummary.mockResolvedValue({
      byStatus: [],
      totals: {
        open: { count: 0, amount: 0 },
        overdue: { count: 0, amount: 0 },
        paid: { count: 0, amount: 0 },
        all: { count: 0, amount: 0 },
      },
    });
    mockListPortalOrders.mockResolvedValue([]);
    mockListPortalJobs.mockResolvedValue([]);
    mockListPortalQuotes.mockResolvedValue([]);
    mockGetDocumentStatus.mockResolvedValue({
      orderId: 'order-1',
      documentType: 'quote',
      status: 'pending',
      url: null,
    });
  });

  it('treats invoice summaries, portal lists, and pending document status as healthy shaped success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useInvoices, useInvoice } = await import('@/hooks/invoices/use-invoices');
    const { useInvoiceSummary } = await import('@/hooks/invoices/use-invoice-summary');
    const { usePortalOrders, usePortalJobs, usePortalQuotes } = await import('@/hooks/portal/use-portal-data');
    const { useDocumentStatus } = await import('@/hooks/documents/use-generate-document');

    const invoices = renderHook(() => useInvoices(), { wrapper: createWrapper(queryClient) });
    const invoice = renderHook(() => useInvoice('invoice-1'), { wrapper: createWrapper(queryClient) });
    const summary = renderHook(() => useInvoiceSummary(), { wrapper: createWrapper(queryClient) });
    const orders = renderHook(() => usePortalOrders(), { wrapper: createWrapper(queryClient) });
    const jobs = renderHook(() => usePortalJobs(), { wrapper: createWrapper(queryClient) });
    const quotes = renderHook(() => usePortalQuotes(), { wrapper: createWrapper(queryClient) });
    const documentStatus = renderHook(
      () => useDocumentStatus({ orderId: 'order-1', documentType: 'quote' }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(invoices.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(invoice.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(summary.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(orders.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(jobs.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(quotes.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(documentStatus.result.current.isSuccess).toBe(true));

    expect(invoices.result.current.data).toMatchObject({
      invoices: [],
      total: 0,
    });
    expect(summary.result.current.data?.totals.all).toEqual({ count: 0, amount: 0 });
    expect(orders.result.current.data).toEqual([]);
    expect(jobs.result.current.data).toEqual([]);
    expect(quotes.result.current.data).toEqual([]);
    expect(documentStatus.result.current.data).toEqual({
      orderId: 'order-1',
      documentType: 'quote',
      status: 'pending',
      url: null,
    });
  });

  it('preserves not-found semantics for invoice detail and document status reads', async () => {
    mockGetInvoice.mockRejectedValueOnce({
      message: 'Invoice not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    });
    mockGetDocumentStatus.mockRejectedValueOnce({
      message: 'Order not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { useInvoice } = await import('@/hooks/invoices/use-invoices');
    const { useDocumentStatus } = await import('@/hooks/documents/use-generate-document');

    const invoice = renderHook(() => useInvoice('missing-invoice'), {
      wrapper: createWrapper(queryClient),
    });
    const documentStatus = renderHook(
      () => useDocumentStatus({ orderId: 'missing-order', documentType: 'invoice' }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(invoice.result.current.error).toBeTruthy());
    await waitFor(() => expect(documentStatus.result.current.error).toBeTruthy());

    expect(invoice.result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested invoice could not be found.',
    });
    expect(documentStatus.result.current.error).toMatchObject({
      failureKind: 'not-found',
      contractType: 'detail-not-found',
      message: 'The requested order could not be found.',
    });
  });

  it('keeps the invoice list visible when summary refresh fails', async () => {
    vi.resetModules();

    const mockUseInvoices = vi.fn(() => ({
      data: {
        invoices: [
          {
            id: 'invoice-1',
            orderNumber: 'ORD-100',
            invoiceNumber: 'INV-100',
            invoiceStatus: 'unpaid',
            invoiceDueDate: null,
            invoiceSentAt: null,
            invoiceViewedAt: null,
            invoicePdfUrl: null,
            total: 100,
            paidAmount: 0,
            balanceDue: 100,
            createdAt: new Date('2026-04-20T00:00:00.000Z'),
            updatedAt: new Date('2026-04-20T00:00:00.000Z'),
            customer: { id: 'customer-1', name: 'Acme Corp', email: 'hello@acme.test' },
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      },
      isLoading: false,
      error: null,
    }));
    const mockUseInvoiceSummary = vi.fn(() => ({
      data: undefined,
      error: new Error('Invoice summary metrics are temporarily unavailable. Please refresh and try again.'),
    }));

    vi.doMock('@/hooks/invoices', () => ({
      useInvoices: mockUseInvoices,
      useInvoiceSummary: mockUseInvoiceSummary,
    }));
    vi.doMock('@/hooks/customers', () => ({
      useCustomers: () => ({
        data: { items: [] },
        error: null,
        isLoading: false,
      }),
    }));
    vi.doMock('@/hooks/invoices/use-bulk-invoice-operations', () => ({
      useBulkSendReminders: () => ({ isPending: false, mutateAsync: vi.fn() }),
      useBulkUpdateInvoiceStatus: () => ({ isPending: false, mutateAsync: vi.fn() }),
    }));
    vi.doMock('@/components/shared/data-table', () => ({
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
        isSelected: () => false,
      }),
      BulkActionsBar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      CheckboxCell: () => <input aria-label="select invoice" type="checkbox" />,
      DataTableColumnHeader: ({ title }: { title: string }) => <span>{title}</span>,
      DateCell: ({ value }: { value: Date | string }) => <span>{String(value)}</span>,
      PriceCell: ({ value }: { value: number | null }) => <span>{value ?? 0}</span>,
    }));
    vi.doMock('@/components/shared/filters', () => ({
      DomainFilterBar: () => <div>filters</div>,
    }));
    vi.doMock('@tanstack/react-router', async () => {
      const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router');
      return {
        ...actual,
        useNavigate: () => vi.fn(),
        Link: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
          <a {...props}>{children}</a>
        ),
      };
    });

    const { InvoiceListContainer } = await import('@/components/domain/invoices/list/invoice-list-container');

    render(
      <InvoiceListContainer
        filters={{ search: '', status: null, customerId: null, dateRange: null, amountRange: null }}
        onFiltersChange={vi.fn()}
        page={1}
        onPageChange={vi.fn()}
      />
    );

    expect(screen.getByText('Invoice summary unavailable')).toBeInTheDocument();
    expect(
      screen.getByText('Invoice summary metrics are temporarily unavailable. Please refresh and try again.')
    ).toBeInTheDocument();
    expect(screen.getAllByText('INV-100').length).toBeGreaterThan(0);
  });

  it('keeps healthy portal sections visible when one section cold-load fails', async () => {
    vi.resetModules();

    vi.doMock('@/hooks/portal', () => ({
      usePortalOrders: () => ({
        data: undefined,
        isLoading: false,
        error: new Error('Portal orders are temporarily unavailable. Please refresh and try again.'),
      }),
      usePortalJobs: () => ({
        data: [{ id: 'job-1', jobNumber: 'JOB-100', status: 'scheduled' }],
        isLoading: false,
        error: null,
      }),
      usePortalQuotes: () => ({
        data: [],
        isLoading: false,
        error: null,
      }),
    }));

    const { Route } = await import('@/routes/portal/index');
    const PortalHome = Route.options.component as React.ComponentType;

    render(<PortalHome />);

    expect(screen.getByText('Orders unavailable')).toBeInTheDocument();
    expect(screen.queryByText('No orders available.')).not.toBeInTheDocument();
    expect(screen.getByText('JOB-100')).toBeInTheDocument();
    expect(screen.getByText('No quotes available.')).toBeInTheDocument();
  });
});
