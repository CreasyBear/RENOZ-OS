import { describe, expect, it } from 'vitest';

import {
  buildBlockedRmaExecutionState,
  buildCompletedRmaExecutionState,
  buildPendingRmaExecutionState,
} from '@/server/functions/orders/_shared/rma-execution-state';

describe('rma execution state helpers', () => {
  it('builds the pending execution payload for received RMAs', () => {
    expect(buildPendingRmaExecutionState()).toEqual({
      executionStatus: 'pending',
      executionBlockedReason: null,
      executionCompletedAt: null,
      executionCompletedBy: null,
    });
  });

  it('builds the completed execution payload from the executed remedy result', () => {
    const completed = buildCompletedRmaExecutionState({
      resolution: 'replacement',
      execution: {
        status: 'processed',
        processedAt: '2026-04-16T08:00:00.000Z',
        processedBy: 'user-1',
        executionStatus: 'completed',
        executionBlockedReason: null,
        executionCompletedAt: '2026-04-16T08:00:00.000Z',
        executionCompletedBy: 'user-1',
        resolutionDetails: {
          resolvedAt: '2026-04-16T08:00:00.000Z',
          resolvedBy: 'user-1',
          replacementOrderId: 'order-2',
          notes: 'Created a draft replacement',
        },
        refundPaymentId: null,
        creditNoteId: null,
        replacementOrderId: 'order-2',
        artifacts: {
          refundPayment: null,
          creditNote: null,
          replacementOrder: { id: 'order-2', label: 'SO-2002' },
          linkedIssueOpen: true,
        },
      },
    });

    expect(completed).toMatchObject({
      status: 'processed',
      resolution: 'replacement',
      executionStatus: 'completed',
      replacementOrderId: 'order-2',
      creditNoteId: null,
      refundPaymentId: null,
      executionBlockedReason: null,
    });
  });

  it('builds the blocked execution payload without inventing artifact truth', () => {
    const blocked = buildBlockedRmaExecutionState({
      resolution: 'refund',
      input: {
        rmaId: 'rma-1',
        resolution: 'refund',
        originalPaymentId: 'payment-1',
        amount: 125,
        notes: 'Retry after payment settlement.',
      },
      userId: 'user-2',
      message: 'Source payment is no longer refundable.',
      now: '2026-04-16T09:00:00.000Z',
    });

    expect(blocked).toEqual({
      status: 'received',
      processedAt: null,
      processedBy: null,
      resolution: 'refund',
      resolutionDetails: {
        resolvedAt: '2026-04-16T09:00:00.000Z',
        resolvedBy: 'user-2',
        refundAmount: 125,
        notes: 'Retry after payment settlement.',
      },
      executionStatus: 'blocked',
      executionBlockedReason: 'Source payment is no longer refundable.',
      executionCompletedAt: null,
      executionCompletedBy: null,
      refundPaymentId: null,
      creditNoteId: null,
      replacementOrderId: null,
    });
  });
});
