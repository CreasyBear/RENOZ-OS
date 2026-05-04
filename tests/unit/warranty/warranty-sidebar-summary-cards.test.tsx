import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps, ReactNode } from 'react';
import { WarrantySidebarSummaryCards } from '@/components/domain/warranty/views/warranty-sidebar-summary-cards';
import { formatDateAustralian } from '@/lib/warranty';

const linkCalls = vi.hoisted(
  () =>
    [] as Array<{
      to: string;
      params?: Record<string, unknown>;
      search?: Record<string, unknown>;
    }>
);

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    search,
    children,
    ...props
  }: {
    to: string;
    params?: Record<string, unknown>;
    search?: Record<string, unknown>;
    children: ReactNode;
  } & ComponentProps<'a'>) => {
    linkCalls.push({ to, params, search });
    return (
      <a href={to} {...props}>
        {children}
      </a>
    );
  },
}));

type WarrantySidebarSummaryContext = ComponentProps<typeof WarrantySidebarSummaryCards>['warranty'];

function createWarranty(
  overrides: Partial<WarrantySidebarSummaryContext> = {}
): WarrantySidebarSummaryContext {
  return {
    customerId: 'customer-1',
    customerName: 'Acme Energy',
    warrantyNumber: 'WAR-001',
    ownerRecord: {
      id: 'owner-1',
      fullName: 'Ava Owner',
      email: 'ava@example.com',
      phone: '0400 000 000',
      address: {
        street1: '1 Battery Way',
        city: 'Perth',
        state: 'WA',
        postalCode: '6000',
        country: 'AU',
      },
      notes: null,
    },
    productId: 'product-1',
    productName: 'RENOZ 48V Battery',
    productSerial: 'RNZ-48100-001',
    sourceEntitlement: {
      id: 'entitlement-1',
      status: 'activated',
      evidenceType: 'serialized',
      provisioningIssueCode: null,
      deliveredAt: '2026-02-03T00:00:00.000Z',
      orderId: 'order-1',
      orderNumber: 'ORD-001',
      shipmentId: 'shipment-1',
      shipmentNumber: 'SHP-001',
      productSerial: 'RNZ-48100-001',
      unitSequence: 1,
    },
    policyName: 'Standard Battery Warranty',
    registrationDate: '2026-02-04T00:00:00.000Z',
    expiryDate: '2031-02-04T00:00:00.000Z',
    ...overrides,
  };
}

describe('WarrantySidebarSummaryCards', () => {
  it('renders customer, owner, product, serial, and delivery entitlement anchors', () => {
    linkCalls.length = 0;

    render(<WarrantySidebarSummaryCards warranty={createWarranty()} />);

    expect(screen.getByText('Purchased Via')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Acme Energy' })).toBeInTheDocument();
    expect(screen.getByText('Warranty #WAR-001')).toBeInTheDocument();
    expect(screen.getByText('Ava Owner')).toBeInTheDocument();
    expect(screen.getByText('ava@example.com')).toBeInTheDocument();
    expect(screen.getByText('1 Battery Way, Perth, WA, 6000')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'RENOZ 48V Battery' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'RNZ-48100-001' })).toBeInTheDocument();
    expect(screen.getByText('Delivery entitlement')).toBeInTheDocument();
    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.getByText('SHP-001')).toBeInTheDocument();
    expect(
      screen.getByText(formatDateAustralian('2026-02-03T00:00:00.000Z', 'numeric'))
    ).toBeInTheDocument();

    expect(linkCalls).toEqual([
      {
        to: '/customers/$customerId',
        params: { customerId: 'customer-1' },
        search: {},
      },
      {
        to: '/products/$productId',
        params: { productId: 'product-1' },
        search: undefined,
      },
      {
        to: '/inventory/browser',
        params: undefined,
        search: {
          view: 'serialized',
          serializedSearch: 'RNZ-48100-001',
          page: 1,
        },
      },
    ]);
  });

  it('renders legacy/manual fallback context without pretending serial or owner data exists', () => {
    linkCalls.length = 0;

    render(
      <WarrantySidebarSummaryCards
        warranty={createWarranty({
          customerName: null,
          ownerRecord: null,
          productName: null,
          productSerial: null,
          sourceEntitlement: null,
        })}
      />
    );

    expect(screen.getByRole('link', { name: 'Unknown Customer' })).toBeInTheDocument();
    expect(screen.getByText('Not captured yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Unknown Product' })).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Serial: N/A')
    ).toBeInTheDocument();
    expect(screen.getByText('Legacy/manual')).toBeInTheDocument();
    expect(screen.getByText('Standard Battery Warranty')).toBeInTheDocument();
    expect(
      screen.getByText(formatDateAustralian('2026-02-04T00:00:00.000Z', 'numeric'))
    ).toBeInTheDocument();
    expect(
      screen.getByText(formatDateAustralian('2031-02-04T00:00:00.000Z', 'numeric'))
    ).toBeInTheDocument();

    expect(linkCalls.map((call) => call.to)).toEqual([
      '/customers/$customerId',
      '/products/$productId',
    ]);
  });
});
