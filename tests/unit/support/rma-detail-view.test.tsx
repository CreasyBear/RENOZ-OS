import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RmaDetailView } from '@/components/domain/support/rma/rma-detail-view';
import type { RmaResponse } from '@/lib/schemas/support/rma';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
    className,
  }: {
    to: string;
    params?: Record<string, string>;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={`${to}:${JSON.stringify(params ?? {})}`} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/shared', () => ({
  EntityHeader: ({
    name,
    subtitle,
  }: {
    name: string;
    subtitle?: string;
  }) => (
    <header>
      <h1>{name}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </header>
  ),
}));

vi.mock('@/components/domain/support/rma/rma-detail-card', () => ({
  RmaDetailCard: () => <section aria-label="RMA body">RMA detail body</section>,
}));

vi.mock('@/components/domain/support/rma/rma-workflow-actions', () => ({
  RmaWorkflowActions: () => <div>Workflow actions</div>,
}));

function noopAsync() {
  return Promise.resolve();
}

function createRma(overrides: Partial<RmaResponse> = {}): RmaResponse {
  return {
    id: 'rma-1',
    organizationId: 'org-1',
    rmaNumber: 'RMA-001',
    issueId: 'issue-1',
    customerId: 'customer-1',
    orderId: 'order-1',
    status: 'processed',
    reason: 'defective',
    reasonDetails: null,
    resolution: 'credit',
    resolutionDetails: {
      resolvedAt: '2026-05-04T09:00:00.000Z',
      resolvedBy: 'user-1',
      creditNoteId: 'credit-1',
    },
    executionStatus: 'completed',
    executionBlockedReason: null,
    executionCompletedAt: '2026-05-04T09:00:00.000Z',
    executionCompletedBy: 'user-1',
    refundPaymentId: 'refund-payment-1',
    creditNoteId: 'credit-1',
    replacementOrderId: 'replacement-order-1',
    inspectionNotes: null,
    internalNotes: null,
    customerNotes: null,
    approvedAt: null,
    approvedBy: null,
    receivedAt: null,
    receivedBy: null,
    processedAt: null,
    processedBy: null,
    rejectedAt: null,
    rejectedBy: null,
    rejectionReason: null,
    sequenceNumber: 1,
    createdAt: new Date('2026-05-04T00:00:00.000Z'),
    updatedAt: new Date('2026-05-04T00:00:00.000Z'),
    createdBy: 'user-1',
    updatedBy: 'user-1',
    lineItems: [],
    customer: null,
    issue: null,
    execution: {
      status: 'completed',
      blockedReason: null,
      refundPayment: { id: 'refund-payment-1', label: null },
      creditNote: { id: 'credit-1', label: 'CN-202605-0001' },
      replacementOrder: { id: 'replacement-order-1', label: 'ORD-REPL-0001' },
      linkedIssueOpen: false,
      completedAt: '2026-05-04T09:00:00.000Z',
      completedBy: 'user-1',
    },
    linkedIssueOpen: false,
    ...overrides,
  };
}

describe('RmaDetailView related context', () => {
  it('keeps the side rail focused on source issue and order navigation', () => {
    render(
      <RmaDetailView
        rma={createRma()}
        onApprove={noopAsync}
        onReject={noopAsync}
        onReceive={noopAsync}
        onProcess={noopAsync}
        onCancel={noopAsync}
      />
    );

    expect(screen.getByText('Related Issue')).toBeInTheDocument();
    expect(screen.getByText('Issue is already closed.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Issue' })).toHaveAttribute(
      'href',
      expect.stringContaining('/support/issues/$issueId')
    );
    expect(screen.getByText('Related Order')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Order' })).toHaveAttribute(
      'href',
      expect.stringContaining('/orders/$orderId')
    );
  });

  it('does not duplicate remedy artifact links in the side rail', () => {
    render(
      <RmaDetailView
        rma={createRma()}
        onApprove={noopAsync}
        onReject={noopAsync}
        onReceive={noopAsync}
        onProcess={noopAsync}
        onCancel={noopAsync}
      />
    );

    expect(screen.queryByText('Credit Note')).not.toBeInTheDocument();
    expect(screen.queryByText('Replacement Order')).not.toBeInTheDocument();
    expect(screen.queryByText('Refund Payment')).not.toBeInTheDocument();
    expect(screen.queryByText('CN-202605-0001')).not.toBeInTheDocument();
    expect(screen.queryByText('ORD-REPL-0001')).not.toBeInTheDocument();
    expect(screen.queryByText('refund-payment-1')).not.toBeInTheDocument();
  });
});
