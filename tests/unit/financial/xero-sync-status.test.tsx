import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { XeroSyncStatus } from '@/components/domain/financial/xero-sync-status';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, search, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock('@/components/ui/dynamic-link', () => ({
  DynamicLink: ({ children, to, search, ...props }: any) => {
    const href =
      typeof to === 'string'
        ? `${to}${search ? `?${new URLSearchParams(search).toString()}` : ''}`
        : '#';
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

vi.mock('@/components/shared/format', () => ({
  FormatAmount: ({ amount }: { amount: number }) => <span>${amount.toFixed(2)}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ asChild, children, ...props }: any) => {
    if (asChild && children) {
      return children;
    }

    return <button {...props}>{children}</button>;
  },
  buttonVariants: () => '',
}));

describe('XeroSyncStatus', () => {
  it('shows actionable mapping guidance and disables blind retry when contact mapping is missing', () => {
    render(
      <XeroSyncStatus
        invoices={[
          {
            orderId: 'order-1',
            orderNumber: 'ORD-001',
            orderDate: new Date('2026-03-16T00:00:00.000Z'),
            total: 1200,
            customerId: 'customer-1',
            customerName: 'Acme Solar',
            xeroInvoiceId: null,
            xeroSyncStatus: 'error',
            xeroSyncError:
              'Customer is missing a trusted Xero contact mapping. Set xeroContactId before syncing invoices.',
            lastXeroSyncAt: new Date('2026-03-16T01:00:00.000Z'),
            xeroInvoiceUrl: null,
            canResync: true,
            customerXeroContactId: null,
            issue: {
              code: 'missing_contact_mapping',
              title: 'Customer mapping required',
              message:
                'Customer is missing a trusted Xero contact mapping. Set xeroContactId before syncing invoices.',
              severity: 'warning',
              nextAction: 'map_customer_contact',
              nextActionLabel: 'Map Customer Contact',
              primaryAction: {
                action: 'map_customer_contact',
                label: 'Map Customer Contact',
              },
              secondaryAction: {
                action: 'review_validation',
                label: 'Review invoice context',
              },
              retryPolicy: 'blocked',
              relatedEntityIds: {
                orderId: 'order-1',
                customerId: 'customer-1',
                customerXeroContactId: null,
              },
            },
          },
        ]}
        isLoading={false}
        activeTab="error"
        onTabChange={vi.fn()}
        consoleView="invoice_sync"
        onConsoleViewChange={vi.fn()}
        onResync={vi.fn()}
        resyncingId={null}
        integration={{
          available: true,
          provider: 'xero',
          connectionId: 'conn-1',
          tenantId: 'tenant-1',
          tenantLabel: 'tenant-1',
          isActive: true,
          status: 'connected',
          message: 'Connected to tenant tenant-1',
          nextAction: null,
          nextActionLabel: null,
        }}
        selectedOrderId="order-1"
        selectedInvoice={{
          orderId: 'order-1',
          orderNumber: 'ORD-001',
          xeroInvoiceId: null,
          xeroSyncStatus: 'error',
          xeroSyncError:
            'Customer is missing a trusted Xero contact mapping. Set xeroContactId before syncing invoices.',
          lastXeroSyncAt: '2026-03-16T01:00:00.000Z',
          xeroInvoiceUrl: null,
          customerId: 'customer-1',
          customerXeroContactId: null,
          issue: {
            code: 'missing_contact_mapping',
            title: 'Customer mapping required',
            message:
              'Customer is missing a trusted Xero contact mapping. Set xeroContactId before syncing invoices.',
            severity: 'warning',
            nextAction: 'map_customer_contact',
            nextActionLabel: 'Map Customer Contact',
            primaryAction: {
              action: 'map_customer_contact',
              label: 'Map Customer Contact',
            },
            secondaryAction: {
              action: 'review_validation',
              label: 'Review invoice context',
            },
            retryPolicy: 'blocked',
            relatedEntityIds: {
              orderId: 'order-1',
              customerId: 'customer-1',
              customerXeroContactId: null,
            },
          },
        }}
        selectedInvoiceLoading={false}
        onSelectInvoice={vi.fn()}
        paymentEvents={[
          {
            id: 'event-1',
            orderId: 'order-1',
            dedupeKey: 'payment:evt-1',
            xeroInvoiceId: 'inv-1',
            paymentId: 'evt-1',
            amount: 1200,
            paymentDate: '2026-03-16',
            reference: 'PAY-1',
            resultState: 'duplicate',
            processedAt: '2026-03-16T02:00:00.000Z',
            payloadSummary: {
              payment: {
                id: 'evt-1',
                date: '2026-03-16',
                reference: 'PAY-1',
              },
              invoice: {
                id: 'inv-1',
              },
              payload: {},
            },
            outcomeTitle: 'Duplicate replay',
            outcomeMessage: 'This webhook event was already processed. No payment was applied twice.',
          },
        ]}
        selectedPaymentEventId={null}
        onSelectPaymentEvent={vi.fn()}
      />
    );

    expect(screen.getAllByText(/customer mapping required/i).length).toBeGreaterThan(1);
    expect(screen.getByRole('link', { name: /map customer contact/i })).toHaveAttribute(
      'href',
      '/customers/customer-1/edit'
    );
    expect(screen.getByRole('button', { name: /retry sync/i })).toBeDisabled();
    expect(screen.getByText(/xero remediation console/i)).toBeInTheDocument();
    expect(screen.getByText(/payment webhook anomalies/i)).toBeInTheDocument();
  });

  it('renders a stable retry-after hint without using wall-clock time', () => {
    render(
      <XeroSyncStatus
        invoices={[
          {
            orderId: 'order-2',
            orderNumber: 'ORD-002',
            orderDate: new Date('2026-03-16T00:00:00.000Z'),
            total: 600,
            customerId: 'customer-2',
            customerName: 'Beta Power',
            xeroInvoiceId: null,
            xeroSyncStatus: 'error',
            xeroSyncError: 'Rate limited',
            lastXeroSyncAt: new Date('2026-03-16T01:00:00.000Z'),
            xeroInvoiceUrl: null,
            canResync: true,
            customerXeroContactId: 'xero-contact-2',
            issue: {
              code: 'rate_limited',
              title: 'Retry later',
              message: 'Xero rate limit exceeded',
              severity: 'warning',
              nextAction: null,
              nextActionLabel: null,
              primaryAction: {
                action: 'review_validation',
                label: 'Review invoice context',
              },
              secondaryAction: {
                action: 'review_validation',
                label: 'Review invoice context',
              },
              retryPolicy: 'retry_after',
              retryAfterSeconds: 90,
            },
          },
        ]}
        isLoading={false}
        activeTab="error"
        onTabChange={vi.fn()}
        consoleView="invoice_sync"
        onConsoleViewChange={vi.fn()}
        onResync={vi.fn()}
        resyncingId={null}
        integration={{
          available: true,
          provider: 'xero',
          connectionId: 'conn-2',
          tenantId: 'tenant-2',
          tenantLabel: 'tenant-2',
          isActive: true,
          status: 'connected',
          message: 'Connected to tenant tenant-2',
          nextAction: null,
          nextActionLabel: null,
        }}
        selectedOrderId="order-2"
        selectedInvoice={{
          orderId: 'order-2',
          orderNumber: 'ORD-002',
          xeroInvoiceId: null,
          xeroSyncStatus: 'error',
          xeroSyncError: 'Rate limited',
          lastXeroSyncAt: '2026-03-16T01:00:00.000Z',
          xeroInvoiceUrl: null,
          customerId: 'customer-2',
          customerXeroContactId: 'xero-contact-2',
          issue: {
            code: 'rate_limited',
            title: 'Retry later',
            message: 'Xero rate limit exceeded',
            severity: 'warning',
            nextAction: null,
            nextActionLabel: null,
            primaryAction: {
              action: 'review_validation',
              label: 'Review invoice context',
            },
            secondaryAction: {
              action: 'review_validation',
              label: 'Review invoice context',
            },
            retryPolicy: 'retry_after',
            retryAfterSeconds: 90,
          },
        }}
        selectedInvoiceLoading={false}
        onSelectInvoice={vi.fn()}
        onSelectPaymentEvent={vi.fn()}
      />
    );

    expect(screen.getByText(/retry available in about 2 minutes\./i)).toBeInTheDocument();
  });
});
