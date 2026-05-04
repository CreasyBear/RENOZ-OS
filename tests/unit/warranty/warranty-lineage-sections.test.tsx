import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps, ReactNode } from 'react';
import { WarrantyLineageSections } from '@/components/domain/warranty/views/warranty-lineage-sections';
import type { WarrantyDetail } from '@/lib/schemas/warranty';

const linkCalls = vi.hoisted(() => [] as Array<{
  to: string;
  params?: Record<string, unknown>;
  search?: Record<string, unknown>;
}>);

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

function createWarranty(overrides: Partial<WarrantyDetail> = {}): WarrantyDetail {
  return {
    id: 'warranty-1',
    warrantyNumber: 'WAR-001',
    organizationId: 'org-1',
    customerId: 'customer-1',
    customerName: 'Acme Energy',
    serviceSystem: null,
    currentOwner: null,
    ownershipHistorySummary: [],
    serviceLinkageStatus: 'linked',
    pendingServiceReview: null,
    systemHistoryPreview: [],
    ownerRecord: {
      id: 'owner-1',
      fullName: 'Avery Owner',
      email: 'avery@example.test',
      phone: '0400 000 000',
      address: null,
      notes: null,
    },
    productId: 'product-1',
    productName: 'RENOZ 48V Battery',
    productSerial: 'RNZ-48100-001',
    warrantyPolicyId: 'policy-1',
    policyName: 'Battery Performance',
    policyType: 'battery_performance',
    registrationDate: '2026-01-01T00:00:00.000Z',
    expiryDate: '2028-01-01T00:00:00.000Z',
    status: 'active',
    currentCycleCount: 128,
    cycleLimit: 6000,
    assignedUserId: null,
    expiryAlertOptOut: false,
    lastExpiryAlertSent: null,
    certificateUrl: null,
    notes: 'Installed behind the warehouse sub-board.',
    activatedAt: '2026-02-03T00:00:00.000Z',
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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    items: [
      {
        id: 'item-1',
        productId: 'product-1',
        productName: 'RENOZ 48V Battery',
        productSku: 'RNZ-48V',
        productSerial: 'RNZ-48100-001-A',
        warrantyStartDate: '2026-02-03T00:00:00.000Z',
        warrantyEndDate: '2028-02-03T00:00:00.000Z',
        warrantyPeriodMonths: 24,
        installationNotes: null,
      },
    ],
    ...overrides,
  };
}

describe('WarrantyLineageSections', () => {
  beforeEach(() => {
    linkCalls.length = 0;
  });

  it('shows entitlement-backed commercial lineage and covered serial context', () => {
    render(<WarrantyLineageSections warranty={createWarranty()} daysUntilExpiry={45} />);

    expect(screen.getByText('Warranty Details')).toBeInTheDocument();
    expect(screen.getByText('Acme Energy')).toBeInTheDocument();
    expect(screen.getByText('Avery Owner')).toBeInTheDocument();
    expect(screen.getByText('avery@example.test · 0400 000 000')).toBeInTheDocument();
    expect(screen.getAllByText('RENOZ 48V Battery').length).toBeGreaterThan(0);
    expect(screen.getAllByText('RNZ-48100-001').length).toBeGreaterThan(0);
    expect(screen.getByText('Battery Performance')).toBeInTheDocument();
    expect(screen.getByText('ORD-001 · SHP-001')).toBeInTheDocument();
    expect(screen.getByText('Delivered 03/02/2026')).toBeInTheDocument();
    expect(screen.getByText('45 Days Left')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('6000')).toBeInTheDocument();
    expect(screen.getByText('Installed behind the warehouse sub-board.')).toBeInTheDocument();

    const coveredItems = screen.getByText('Covered Items').closest('[data-slot="accordion"]');
    expect(coveredItems).not.toBeNull();
    expect(within(coveredItems as HTMLElement).getByText('RNZ-48V')).toBeInTheDocument();
    expect(within(coveredItems as HTMLElement).getByText('RNZ-48100-001-A')).toBeInTheDocument();

    expect(linkCalls).toEqual(
      expect.arrayContaining([
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
          search: { view: 'serialized', serializedSearch: 'RNZ-48100-001', page: 1 },
        },
        {
          to: '/inventory/browser',
          params: undefined,
          search: { view: 'serialized', serializedSearch: 'RNZ-48100-001-A', page: 1 },
        },
      ])
    );
  });

  it('shows legacy/manual and missing-serial fallback states without inventing lineage', () => {
    render(
      <WarrantyLineageSections
        warranty={createWarranty({
          customerName: null,
          ownerRecord: null,
          productName: null,
          productSerial: null,
          policyName: 'Standard Warranty',
          policyType: 'installation_workmanship',
          currentCycleCount: null,
          cycleLimit: null,
          sourceEntitlement: null,
          notes: null,
          items: [],
        })}
        daysUntilExpiry={120}
      />
    );

    expect(screen.getByText('Unknown Customer')).toBeInTheDocument();
    expect(screen.getByText('Unknown Product')).toBeInTheDocument();
    expect(screen.getByText('Not captured yet')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByText('Legacy/manual warranty')).toBeInTheDocument();
    expect(screen.getByText('No items recorded.')).toBeInTheDocument();
    expect(screen.queryByText('Current Cycles')).not.toBeInTheDocument();
    expect(screen.queryByText('Cycle Limit')).not.toBeInTheDocument();

    expect(
      linkCalls.some(
        (call) =>
          call.to === '/inventory/browser' &&
          call.search?.serializedSearch === 'RNZ-48100-001'
      )
    ).toBe(false);
  });
});
