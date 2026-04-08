import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockGetOrderGeneratedDocuments = vi.fn();

vi.mock('@tanstack/react-start', () => ({
  useServerFn: () => mockGetOrderGeneratedDocuments,
  createServerFn: () => ({
    handler: (handler: unknown) => handler,
    inputValidator: () => ({
      handler: (handler: unknown) => handler,
    }),
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
}));

vi.mock('@/components/shared/format', () => ({
  FormatAmount: ({ amount }: { amount: number }) => <span>${amount}</span>,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'OrderDocumentSurfacesWrapper';
  return Wrapper;
}

const documentActions = {
  onGenerateQuote: vi.fn(async () => undefined),
  onGenerateInvoice: vi.fn(async () => undefined),
  onGenerateProForma: vi.fn(async () => undefined),
  onGeneratePackingSlip: vi.fn(async () => undefined),
  onGenerateDeliveryNote: vi.fn(async () => undefined),
  onGenerateDispatchNote: vi.fn(async () => undefined),
  isGeneratingQuote: false,
  isGeneratingInvoice: false,
  isGeneratingProForma: false,
  isGeneratingPackingSlip: false,
  isGeneratingDeliveryNote: false,
  isGeneratingDispatchNote: false,
};

describe('order document surfaces', () => {
  it('renders generation actions in the documents tab alongside history', async () => {
    mockGetOrderGeneratedDocuments.mockResolvedValue([]);

    const { OrderDocumentsTab } = await import('@/components/domain/orders/tabs/order-documents-tab');

    render(<OrderDocumentsTab orderId="order-1" documentActions={documentActions} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByRole('button', { name: 'Generate Quote' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate Invoice' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate Pro-Forma' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate Packing Slip' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate Delivery Note' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate Dispatch Note' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('No documents yet')).toBeInTheDocument();
    });
  });

  it('renders the expanded document quick actions in the existing detail sidebar', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { OrderDetailView } = await import('@/components/domain/orders/views/order-detail-view');

    render(
      <OrderDetailView
        order={{
          id: 'order-1',
          orderNumber: 'SO-100',
          customerId: 'customer-1',
          status: 'confirmed',
          paymentStatus: 'partial',
          orderDate: new Date('2026-04-01'),
          dueDate: new Date('2026-04-05'),
          shippedDate: null,
          deliveredDate: null,
          total: 1200,
          paidAmount: 750,
          balanceDue: 450,
          version: 3,
          createdAt: new Date('2026-04-01'),
          updatedAt: new Date('2026-04-02'),
          lineItems: [],
          quotePdfUrl: null,
          invoiceNumber: null,
          invoicePdfUrl: null,
          xeroInvoiceUrl: null,
          customer: {
            id: 'customer-1',
            name: 'Acme',
            email: 'ops@acme.test',
            phone: '0400 000 000',
          },
        } as never}
        activeTab="payments"
        onTabChange={vi.fn()}
        showMetaPanel
        onToggleMetaPanel={vi.fn()}
        activities={[]}
        activitiesLoading={false}
        activitiesError={null}
        documentActions={documentActions}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getAllByText('Documents').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Quote').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Invoice').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pro-Forma').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Packing Slip').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Delivery Note').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Dispatch Note').length).toBeGreaterThan(0);
  });

  it('marks stale shipment-backed operational docs and routes regeneration back into fulfillment', async () => {
    const onOpenFulfillment = vi.fn();
    mockGetOrderGeneratedDocuments.mockResolvedValue([
      {
        id: 'doc-1',
        documentType: 'packing-slip',
        entityType: 'shipment',
        entityId: 'shipment-1',
        filename: 'packing-slip.pdf',
        storageUrl: 'https://example.test/doc.pdf',
        fileSize: 1024,
        generatedAt: new Date('2026-04-01T10:00:00.000Z'),
        shipmentNumber: 'SHP-200',
        isStale: true,
        staleReason: 'Shipment details changed after this document was generated.',
      },
    ]);

    const { OrderDocumentsTab } = await import('@/components/domain/orders/tabs/order-documents-tab');

    render(
      <OrderDocumentsTab
        orderId="order-1"
        documentActions={documentActions}
        onOpenFulfillment={onOpenFulfillment}
      />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByText('Stale')).toBeInTheDocument();
    const regenerateButton = screen.getByRole('button', { name: 'Regenerate in Fulfillment' });
    fireEvent.click(regenerateButton);
    expect(onOpenFulfillment).toHaveBeenCalledTimes(1);
  });
});
