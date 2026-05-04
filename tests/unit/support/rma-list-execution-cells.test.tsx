import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  RmaListContextCell,
  RmaListRemedyCell,
} from '@/components/domain/support/rma/rma-list-execution-cells';
import type { RmaResponse } from '@/lib/schemas/support/rma';

vi.mock('resend', () => ({
  Resend: class MockResend {},
}));

function createRma(overrides: Partial<RmaResponse> = {}): RmaResponse {
  return {
    id: 'rma-1',
    organizationId: 'org-1',
    rmaNumber: 'RMA-001',
    issueId: 'issue-1',
    customerId: 'customer-1',
    orderId: '12345678-order-1',
    status: 'received',
    reason: 'defective',
    reasonDetails: null,
    resolution: null,
    resolutionDetails: null,
    executionStatus: 'pending',
    executionBlockedReason: null,
    executionCompletedAt: null,
    executionCompletedBy: null,
    refundPaymentId: null,
    creditNoteId: null,
    replacementOrderId: null,
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
      status: 'pending',
      blockedReason: null,
      refundPayment: null,
      creditNote: null,
      replacementOrder: null,
      linkedIssueOpen: true,
      completedAt: null,
      completedBy: null,
    },
    linkedIssueOpen: true,
    ...overrides,
  };
}

describe('RMA list execution cells', () => {
  it('renders pending rows as awaiting remedy execution with source context', () => {
    const rma = createRma();

    render(
      <>
        <RmaListRemedyCell rma={rma} />
        <RmaListContextCell rma={rma} />
      </>
    );

    expect(screen.getByText('Not selected')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Awaiting remedy execution')).toBeInTheDocument();
    expect(
      screen.getByText('Receipt is complete, but the remedy has not been executed yet.')
    ).toBeInTheDocument();
    expect(screen.getByText('Order 12345678 · Issue open')).toBeInTheDocument();
  });

  it('renders blocked rows with blocker detail and no fake artifact context', () => {
    const rma = createRma({
      resolution: 'replacement',
      executionStatus: 'blocked',
      execution: {
        status: 'blocked',
        blockedReason: 'Replacement blocked by missing customer account.',
        refundPayment: null,
        creditNote: null,
        replacementOrder: null,
        linkedIssueOpen: true,
        completedAt: null,
        completedBy: null,
      },
    });

    render(
      <>
        <RmaListRemedyCell rma={rma} />
        <RmaListContextCell rma={rma} />
      </>
    );

    expect(screen.getAllByText('Replacement').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText('Execution blocked')).toBeInTheDocument();
    expect(
      screen.getByText('Replacement blocked by missing customer account.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/Replacement ORD-/)).not.toBeInTheDocument();
  });

  it('renders completed artifact context for replacement orders', () => {
    const rma = createRma({
      status: 'processed',
      resolution: 'replacement',
      executionStatus: 'completed',
      linkedIssueOpen: false,
      execution: {
        status: 'completed',
        blockedReason: null,
        refundPayment: null,
        creditNote: null,
        replacementOrder: { id: 'order-2', label: 'ORD-REPL-0001' },
        linkedIssueOpen: false,
        completedAt: '2026-05-04T09:00:00.000Z',
        completedBy: 'user-1',
      },
    });

    render(
      <>
        <RmaListRemedyCell rma={rma} />
        <RmaListContextCell rma={rma} />
      </>
    );

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Replacement ORD-REPL-0001')).toBeInTheDocument();
    expect(screen.getByText('Draft replacement order created.')).toBeInTheDocument();
    expect(screen.getByText('Order 12345678 · Issue closed')).toBeInTheDocument();
  });
});
