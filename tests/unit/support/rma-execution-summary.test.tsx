import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RmaExecutionSummary } from '@/components/domain/support/rma/rma-execution-summary';
import type { RmaResponse } from '@/lib/schemas/support/rma';

vi.mock('resend', () => ({
  Resend: class MockResend {},
}));

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

function createRma(overrides: Partial<RmaResponse> = {}): RmaResponse {
  return {
    id: 'rma-1',
    organizationId: 'org-1',
    rmaNumber: 'RMA-001',
    issueId: 'issue-1',
    customerId: 'customer-1',
    orderId: 'order-1',
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

describe('RmaExecutionSummary', () => {
  it('renders blocked remedy execution without linked artifact truth', () => {
    render(
      <RmaExecutionSummary
        rma={createRma({
          resolution: 'replacement',
          resolutionDetails: {
            resolvedAt: '2026-05-04T09:00:00.000Z',
            resolvedBy: 'user-1',
            notes: 'Waiting on replacement eligibility.',
          },
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
        })}
      />
    );

    expect(screen.getByText('Remedy Execution')).toBeInTheDocument();
    expect(screen.getAllByText('Replacement').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(
      screen.getByText('Replacement blocked by missing customer account.')
    ).toBeInTheDocument();
    expect(screen.getByText('Waiting on replacement eligibility.')).toBeInTheDocument();
    expect(screen.queryByText('Linked Records')).not.toBeInTheDocument();
  });

  it('renders completed credit and replacement artifact links from execution summary', () => {
    render(
      <RmaExecutionSummary
        rma={createRma({
          status: 'processed',
          resolution: 'credit',
          resolutionDetails: {
            resolvedAt: '2026-05-04T09:00:00.000Z',
            resolvedBy: 'user-1',
            creditNoteId: 'credit-1',
            notes: 'Goodwill credit issued.',
          },
          execution: {
            status: 'completed',
            blockedReason: null,
            refundPayment: null,
            creditNote: { id: 'credit-1', label: 'CN-202605-0001' },
            replacementOrder: { id: 'order-2', label: 'ORD-REPL-0001' },
            linkedIssueOpen: false,
            completedAt: '2026-05-04T09:00:00.000Z',
            completedBy: 'user-1',
          },
        })}
      />
    );

    expect(screen.getAllByText('Credit Note').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Goodwill credit issued.')).toBeInTheDocument();
    expect(screen.getByText('Linked Records')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CN-202605-0001' })).toHaveAttribute(
      'href',
      expect.stringContaining('/financial/credit-notes/$creditNoteId')
    );
    expect(screen.getByRole('link', { name: 'ORD-REPL-0001' })).toHaveAttribute(
      'href',
      expect.stringContaining('/orders/$orderId')
    );
  });

  it('keeps refund amount and refund payment visible for refund remedies', () => {
    render(
      <RmaExecutionSummary
        rma={createRma({
          status: 'processed',
          resolution: 'refund',
          resolutionDetails: {
            resolvedAt: '2026-05-04T09:00:00.000Z',
            resolvedBy: 'user-1',
            refundAmount: 125,
          },
          execution: {
            status: 'completed',
            blockedReason: null,
            refundPayment: { id: 'refund-payment-1', label: null },
            creditNote: null,
            replacementOrder: null,
            linkedIssueOpen: false,
            completedAt: '2026-05-04T09:00:00.000Z',
            completedBy: 'user-1',
          },
        })}
      />
    );

    expect(screen.getAllByText('Refund').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('$125.00')).toBeInTheDocument();
    expect(screen.getByText('refund-payment-1')).toBeInTheDocument();
  });
});
