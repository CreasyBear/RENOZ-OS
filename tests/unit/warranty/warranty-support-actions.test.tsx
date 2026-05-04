import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps, ReactNode } from 'react';
import { WarrantySupportActions } from '@/components/domain/warranty/views/warranty-support-actions';

const linkCalls = vi.hoisted(() => [] as Array<{ to: string; search?: Record<string, unknown> }>);

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    search,
    children,
    ...props
  }: {
    to: string;
    search?: Record<string, unknown>;
    children: ReactNode;
  } & ComponentProps<'a'>) => {
    linkCalls.push({ to, search });
    return (
      <a href={to} {...props}>
        {children}
      </a>
    );
  },
}));

type WarrantySupportContext = ComponentProps<typeof WarrantySupportActions>['warranty'];

function createWarranty(
  overrides: Partial<WarrantySupportContext> = {}
): WarrantySupportContext {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    customerId: '22222222-2222-2222-2222-222222222222',
    productId: '33333333-3333-3333-3333-333333333333',
    productSerial: 'RNZ-48100-001',
    sourceEntitlement: {
      id: '44444444-4444-4444-4444-444444444444',
      status: 'activated',
      evidenceType: 'serialized',
      provisioningIssueCode: null,
      deliveredAt: '2026-02-03T00:00:00.000Z',
      orderId: '55555555-5555-5555-5555-555555555555',
      orderNumber: 'ORD-001',
      shipmentId: '66666666-6666-6666-6666-666666666666',
      shipmentNumber: 'SHP-001',
      productSerial: 'RNZ-48100-001',
      unitSequence: 1,
    },
    ...overrides,
  };
}

describe('WarrantySupportActions', () => {
  it('carries warranty entitlement, order, shipment, product, customer, and serial anchors into support intake', () => {
    linkCalls.length = 0;

    render(<WarrantySupportActions warranty={createWarranty()} />);

    expect(screen.getByText('Support Actions')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Create Support Issue/ })).toBeInTheDocument();
    expect(screen.getByText('Log a new support issue for this warranty')).toBeInTheDocument();
    expect(linkCalls).toHaveLength(1);
    expect(linkCalls[0]).toEqual({
      to: '/support/issues/new',
      search: {
        customerId: '22222222-2222-2222-2222-222222222222',
        warrantyId: '11111111-1111-1111-1111-111111111111',
        warrantyEntitlementId: '44444444-4444-4444-4444-444444444444',
        productId: '33333333-3333-3333-3333-333333333333',
        orderId: '55555555-5555-5555-5555-555555555555',
        shipmentId: '66666666-6666-6666-6666-666666666666',
        serialNumber: 'RNZ-48100-001',
      },
    });
  });

  it('keeps legacy/manual warranty handoff limited to known anchors', () => {
    linkCalls.length = 0;

    render(
      <WarrantySupportActions
        warranty={createWarranty({
          productSerial: null,
          sourceEntitlement: null,
        })}
      />
    );

    expect(linkCalls).toHaveLength(1);
    expect(linkCalls[0]?.search).toEqual({
      customerId: '22222222-2222-2222-2222-222222222222',
      warrantyId: '11111111-1111-1111-1111-111111111111',
      warrantyEntitlementId: undefined,
      productId: '33333333-3333-3333-3333-333333333333',
      orderId: undefined,
      shipmentId: undefined,
      serialNumber: undefined,
    });
  });
});
