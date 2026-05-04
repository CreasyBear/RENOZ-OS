import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { IssueCustomerContextSidebar } from '@/components/domain/support/issues/issue-customer-context-sidebar';
import type { CustomerContextData } from '@/hooks/support';

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

function createContext(overrides: Partial<CustomerContextData> = {}): CustomerContextData {
  return {
    orderSummary: {
      totalOrders: 4,
      recentOrders: [
        {
          id: 'order-1',
          orderNumber: 'ORD-001',
          orderDate: '2026-05-01T00:00:00.000Z',
          status: 'shipped',
        },
        {
          id: 'order-2',
          orderNumber: 'ORD-002',
          orderDate: '2026-05-02T00:00:00.000Z',
          status: 'draft',
        },
        {
          id: 'order-3',
          orderNumber: 'ORD-003',
          orderDate: null,
          status: 'pending',
        },
        {
          id: 'order-4',
          orderNumber: 'ORD-004',
          orderDate: '2026-05-04T00:00:00.000Z',
          status: 'paid',
        },
      ],
    },
    warranties: [
      {
        id: 'warranty-1',
        productName: 'RENOZ 5kWh Battery',
        productSerial: 'RNZ-001',
        status: 'active',
      },
      {
        id: 'warranty-2',
        productName: 'RENOZ 10kWh Battery',
        productSerial: null,
        status: 'expired',
      },
      {
        id: 'warranty-3',
        productName: 'RENOZ Inverter',
        productSerial: 'RNZ-003',
        status: 'expiring_soon',
      },
    ],
    otherIssues: [
      {
        id: 'issue-1',
        title: 'Battery not charging',
        createdAt: '2026-05-01T00:00:00.000Z',
        status: 'open',
      },
      {
        id: 'issue-2',
        title: 'Install follow-up',
        createdAt: '2026-05-02T00:00:00.000Z',
        status: 'resolved',
      },
      {
        id: 'issue-3',
        title: 'Firmware question',
        createdAt: '2026-05-03T00:00:00.000Z',
        status: 'closed',
      },
      {
        id: 'issue-4',
        title: 'Hidden fourth issue',
        createdAt: '2026-05-04T00:00:00.000Z',
        status: 'open',
      },
    ],
    isLoading: false,
    error: null,
    ...overrides,
  };
}

describe('IssueCustomerContextSidebar', () => {
  it('renders compact customer context with capped order, warranty, and issue lists', () => {
    render(
      <IssueCustomerContextSidebar
        customerId="customer-123456"
        customerName="Acme Energy"
        contextData={createContext()}
      />
    );

    expect(screen.getByText('Acme Energy')).toBeInTheDocument();
    expect(screen.getByText('ID: customer...')).toBeInTheDocument();

    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.getByText('ORD-002')).toBeInTheDocument();
    expect(screen.getByText('ORD-003')).toBeInTheDocument();
    expect(screen.queryByText('ORD-004')).not.toBeInTheDocument();

    expect(screen.getByText('2 active')).toBeInTheDocument();
    expect(screen.getByText('RENOZ 5kWh Battery')).toBeInTheDocument();
    expect(screen.getByLabelText('Open serial RNZ-001 in inventory')).toBeInTheDocument();

    expect(screen.getByText('Battery not charging')).toBeInTheDocument();
    expect(screen.getByText('Install follow-up')).toBeInTheDocument();
    expect(screen.getByText('Firmware question')).toBeInTheDocument();
    expect(screen.queryByText('Hidden fourth issue')).not.toBeInTheDocument();
  });

  it('renders loading states for context cards', () => {
    render(
      <IssueCustomerContextSidebar
        customerId="customer-123456"
        customerName={null}
        contextData={createContext({
          isLoading: true,
          error: null,
          orderSummary: null,
          warranties: [],
          otherIssues: [],
        })}
      />
    );

    expect(screen.getByText('Unknown Customer')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Loading')).toHaveLength(3);
  });

  it('renders operator-safe context load failures', () => {
    render(
      <IssueCustomerContextSidebar
        customerId="customer-123456"
        customerName="Acme Energy"
        contextData={createContext({
          isLoading: false,
          error: new Error('Context unavailable'),
          orderSummary: null,
          warranties: [],
          otherIssues: [],
        })}
      />
    );

    expect(screen.getByText('Failed to load orders')).toBeInTheDocument();
    expect(screen.getByText('Failed to load warranties')).toBeInTheDocument();
    expect(screen.getByText('Failed to load issues')).toBeInTheDocument();
  });
});
