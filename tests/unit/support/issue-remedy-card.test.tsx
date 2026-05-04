import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { IssueRemedyCard } from '@/components/domain/support/issues/issue-remedy-card';
import type { IssueRmaReadiness } from '@/lib/schemas/support/issues';

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

function createReadiness(
  overrides: Partial<IssueRmaReadiness> = {}
): IssueRmaReadiness {
  return {
    state: 'ready',
    blockedReasonCode: null,
    blockedReason: null,
    sourceOrder: {
      id: 'order-1',
      orderNumber: 'ORD-001',
      customerId: 'customer-1',
      customerName: 'Acme Energy',
    },
    eligibleLineItems: [],
    existingRmas: [
      {
        id: 'rma-1',
        rmaNumber: 'RMA-001',
        status: 'processed',
        executionStatus: 'completed',
        reason: 'performance_issue',
        creditNoteId: 'credit-1',
        replacementOrderId: null,
        refundPaymentId: null,
        createdAt: '2026-05-04T00:00:00.000Z',
      },
    ],
    suggestedReason: 'performance_issue',
    ...overrides,
  };
}

describe('IssueRemedyCard', () => {
  it('renders ready RMA context with source order, suggested reason, and prior RMAs', () => {
    render(
      <IssueRemedyCard
        issueId="issue-1"
        rmaReadiness={createReadiness()}
      />
    );

    expect(screen.getByText('Remedy')).toBeInTheDocument();
    expect(screen.getByText('RMA Ready')).toBeInTheDocument();
    expect(screen.getByText('Suggested reason: performance issue')).toBeInTheDocument();

    const orderLink = screen.getByRole('link', { name: 'ORD-001' });
    expect(orderLink).toHaveAttribute(
      'href',
      '/orders/$orderId:{"orderId":"order-1"}:{"fromIssueId":"issue-1"}'
    );

    expect(screen.getByText('Prior RMAs')).toBeInTheDocument();
    expect(screen.getByText('RMA-001')).toBeInTheDocument();
    expect(screen.getByText(/Credit note issued/)).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('renders blocked readiness without implying an available RMA path', () => {
    render(
      <IssueRemedyCard
        issueId="issue-1"
        rmaReadiness={createReadiness({
          state: 'blocked',
          blockedReasonCode: 'source_order_missing',
          blockedReason: 'Resolve the source order before creating an RMA.',
          sourceOrder: null,
          existingRmas: [],
          suggestedReason: null,
        })}
      />
    );

    expect(screen.getByText('RMA Blocked')).toBeInTheDocument();
    expect(
      screen.getByText('Resolve the source order before creating an RMA.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Prior RMAs')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'ORD-001' })).not.toBeInTheDocument();
  });

  it('labels linked RMA readiness distinctly from newly ready returns', () => {
    render(
      <IssueRemedyCard
        issueId="issue-1"
        rmaReadiness={createReadiness({
          state: 'linked',
          sourceOrder: null,
          suggestedReason: null,
          existingRmas: [
            {
              id: 'rma-2',
              rmaNumber: 'RMA-002',
              status: 'received',
              executionStatus: null,
              reason: 'defective',
              creditNoteId: null,
              replacementOrderId: 'replacement-order-1',
              refundPaymentId: null,
              createdAt: '2026-05-03T00:00:00.000Z',
            },
          ],
        })}
      />
    );

    expect(screen.getByText('RMA Already Linked')).toBeInTheDocument();
    expect(screen.getByText('RMA-002')).toBeInTheDocument();
    expect(screen.getByText(/Replacement created/)).toBeInTheDocument();
  });
});
