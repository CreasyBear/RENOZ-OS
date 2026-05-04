import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { IssueRelatedTab } from '@/components/domain/support/issues/issue-related-tab';
import type { IssueDetail, IssueRelatedContext } from '@/lib/schemas/support/issues';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    search,
    children,
    className,
    ...props
  }: {
    to: string;
    params?: Record<string, string>;
    search?: Record<string, unknown>;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a
      href={`${to}:${JSON.stringify(params ?? {})}:${JSON.stringify(search ?? {})}`}
      className={className}
      {...props}
    >
      {children}
    </a>
  ),
}));

function createCustomerContext(): NonNullable<IssueRelatedContext['customerContext']> {
  return {
    recentOrders: Array.from({ length: 6 }, (_, index) => ({
      id: `order-${index + 1}`,
      orderNumber: `ORD-00${index + 1}`,
      orderDate: `2026-05-0${index + 1}T00:00:00.000Z`,
      status: index % 2 === 0 ? 'shipped' : 'draft',
    })),
    warranties: Array.from({ length: 6 }, (_, index) => ({
      id: `warranty-${index + 1}`,
      productName: `Warranty Product ${index + 1}`,
      productSerial: `WARR-SN-${index + 1}`,
      status: index % 2 === 0 ? 'active' : 'expired',
    })),
    otherIssues: Array.from({ length: 6 }, (_, index) => ({
      id: `customer-issue-${index + 1}`,
      title: `Customer issue ${index + 1}`,
      createdAt: `2026-05-0${index + 1}T00:00:00.000Z`,
      status: index % 2 === 0 ? 'open' : 'resolved',
    })),
  };
}

function createRelatedContext(
  overrides: Partial<IssueRelatedContext> = {}
): IssueRelatedContext {
  return {
    linkedWarranty: {
      id: 'source-warranty-1',
      warrantyNumber: 'WAR-001',
      status: 'active',
      productSerial: 'RNZ-001',
    },
    linkedOrder: {
      id: 'source-order-1',
      orderNumber: 'SRC-001',
      customerId: 'customer-1',
      customerName: 'Acme Energy',
    },
    linkedShipment: {
      id: 'shipment-1',
      shipmentNumber: 'SHP-001',
    },
    relatedSerials: [
      {
        serializedItemId: 'serial-1',
        serialNumber: 'RNZ-001',
        productName: 'RENOZ 5kWh Battery',
        orderLineItemId: 'line-1',
        orderLineDescription: 'Battery line',
        shipmentId: 'shipment-1',
        shipmentNumber: 'SHP-001',
        source: 'shipment',
      },
    ],
    linkedRmas: [
      {
        id: 'rma-1',
        rmaNumber: 'RMA-001',
        status: 'processed',
        executionStatus: 'completed',
        reason: 'defective',
        creditNoteId: 'credit-1',
        replacementOrderId: null,
        refundPaymentId: null,
        createdAt: '2026-05-04T00:00:00.000Z',
      },
    ],
    sameServiceSystemIssues: [
      {
        id: 'issue-2',
        issueNumber: 'ISS-002',
        title: 'Same system fault',
        status: 'open',
        priority: 'high',
        createdAt: '2026-05-02T00:00:00.000Z',
      },
    ],
    sameSerializedItemIssues: [
      {
        id: 'issue-3',
        issueNumber: 'ISS-003',
        title: 'Same serial history',
        status: 'closed',
        priority: 'medium',
        createdAt: '2026-05-03T00:00:00.000Z',
      },
    ],
    customerContext: createCustomerContext(),
    ...overrides,
  };
}

const supportContext: NonNullable<IssueDetail['supportContext']> = {
  resolutionSource: 'order',
  commercialCustomer: { id: 'customer-1', name: 'Acme Energy' },
  serviceSystem: { id: 'system-1', displayName: 'Battery system A' },
  currentOwner: {
    id: 'owner-1',
    fullName: 'Site Owner',
    email: null,
    phone: null,
  },
  order: {
    id: 'source-order-1',
    orderNumber: 'SRC-001',
    customerId: 'customer-1',
    customerName: 'Acme Energy',
  },
};

describe('IssueRelatedTab', () => {
  it('renders anchor-first related context and caps customer-wide lists', () => {
    render(
      <IssueRelatedTab
        customerId="customer-1"
        supportContext={supportContext}
        relatedContext={createRelatedContext()}
      />
    );

    expect(screen.getByText('Linked Warranty')).toBeInTheDocument();
    expect(screen.getByText('WAR-001')).toBeInTheDocument();
    expect(screen.getByText('Source Order')).toBeInTheDocument();
    expect(screen.getByText('SRC-001')).toBeInTheDocument();
    expect(screen.getByText('Source Shipment')).toBeInTheDocument();
    expect(screen.getByText('SHP-001')).toBeInTheDocument();
    expect(screen.getByText('RNZ-001')).toBeInTheDocument();
    expect(screen.getByText('Battery system A')).toBeInTheDocument();
    expect(screen.getByText('Current owner: Site Owner')).toBeInTheDocument();
    expect(screen.getByText('ISS-002 · Same system fault')).toBeInTheDocument();
    expect(screen.getByText('ISS-003 · Same serial history')).toBeInTheDocument();
    expect(screen.getByText('RMA-001')).toBeInTheDocument();
    expect(screen.getByText('Customer-Wide Context')).toBeInTheDocument();

    expect(screen.getByText('ORD-005')).toBeInTheDocument();
    expect(screen.queryByText('ORD-006')).not.toBeInTheDocument();
    expect(screen.getByText('Warranty Product 5')).toBeInTheDocument();
    expect(screen.queryByText('Warranty Product 6')).not.toBeInTheDocument();
    expect(screen.getByText('Customer issue 5')).toBeInTheDocument();
    expect(screen.queryByText('Customer issue 6')).not.toBeInTheDocument();
  });

  it('renders an honest empty state when no system or serial issues are linked', () => {
    render(
      <IssueRelatedTab
        customerId={null}
        supportContext={null}
        relatedContext={createRelatedContext({
          linkedWarranty: null,
          linkedOrder: null,
          linkedShipment: null,
          relatedSerials: [],
          linkedRmas: [],
          sameServiceSystemIssues: [],
          sameSerializedItemIssues: [],
          customerContext: null,
        })}
      />
    );

    expect(screen.getByText('System & Serial History')).toBeInTheDocument();
    expect(screen.getByText('No anchor-linked issues yet')).toBeInTheDocument();
    expect(
      screen.getByText('No other issues were found for this service system or serialized item.')
    ).toBeInTheDocument();
  });
});
