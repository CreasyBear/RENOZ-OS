import { describe, expect, it } from 'vitest';
import { processRmaSchema } from '@/lib/schemas/support/rma';
import {
  buildBlockedRmaExecutionState,
  buildCompletedRmaExecutionState,
} from '@/server/functions/orders/_shared/rma-execution-state';
import { buildRmaExecutionSummary } from '@/server/functions/orders/_shared/rma-remedy-execution';

const rmaId = '11111111-1111-4111-8111-111111111111';

describe('RMA remedy execution evidence', () => {
  it('requires side-effect evidence fields for artifact-producing resolutions', () => {
    expect(processRmaSchema.safeParse({ rmaId, resolution: 'refund', amount: 100 }).success).toBe(false);
    expect(
      processRmaSchema.parse({
        rmaId,
        resolution: 'refund',
        originalPaymentId: '22222222-2222-4222-8222-222222222222',
        amount: 100,
      })
    ).toMatchObject({ resolution: 'refund', amount: 100 });

    expect(processRmaSchema.safeParse({ rmaId, resolution: 'credit', amount: 100 }).success).toBe(false);
    expect(
      processRmaSchema.parse({
        rmaId,
        resolution: 'credit',
        amount: 100,
        creditReason: 'Warranty goodwill',
      })
    ).toMatchObject({ resolution: 'credit', amount: 100, applyNow: true });

    expect(processRmaSchema.safeParse({ rmaId, resolution: 'replacement' }).success).toBe(false);
    expect(
      processRmaSchema.parse({
        rmaId,
        resolution: 'replacement',
        confirmReplacement: true,
      })
    ).toMatchObject({ resolution: 'replacement', confirmReplacement: true });
  });

  it('keeps repair and no-action as explicit no-artifact remedies', () => {
    expect(processRmaSchema.parse({ rmaId, resolution: 'repair' })).toEqual({
      rmaId,
      resolution: 'repair',
    });
    expect(processRmaSchema.parse({ rmaId, resolution: 'no_action', notes: 'Customer withdrew.' })).toEqual({
      rmaId,
      resolution: 'no_action',
      notes: 'Customer withdrew.',
    });
  });

  it('projects completed artifact links as the canonical execution summary', () => {
    const completed = buildCompletedRmaExecutionState({
      resolution: 'credit',
      execution: {
        status: 'processed',
        processedAt: '2026-05-04T09:00:00.000Z',
        processedBy: 'user-1',
        executionStatus: 'completed',
        executionBlockedReason: null,
        executionCompletedAt: '2026-05-04T09:00:00.000Z',
        executionCompletedBy: 'user-1',
        resolutionDetails: {
          resolvedAt: '2026-05-04T09:00:00.000Z',
          resolvedBy: 'user-1',
          creditNoteId: 'credit-1',
        },
        refundPaymentId: null,
        creditNoteId: 'credit-1',
        replacementOrderId: null,
        artifacts: {
          refundPayment: null,
          creditNote: { id: 'credit-1', label: 'CN-1001' },
          replacementOrder: null,
          linkedIssueOpen: false,
        },
      },
    });

    expect(completed).toMatchObject({
      status: 'processed',
      executionStatus: 'completed',
      creditNoteId: 'credit-1',
      refundPaymentId: null,
      replacementOrderId: null,
    });

    expect(
      buildRmaExecutionSummary({
        rma: completed,
        artifacts: {
          refundPayment: null,
          creditNote: { id: 'credit-1', label: 'CN-1001' },
          replacementOrder: null,
          linkedIssueOpen: false,
        },
      })
    ).toEqual({
      status: 'completed',
      blockedReason: null,
      refundPayment: null,
      creditNote: { id: 'credit-1', label: 'CN-1001' },
      replacementOrder: null,
      linkedIssueOpen: false,
      completedAt: '2026-05-04T09:00:00.000Z',
      completedBy: 'user-1',
    });
  });

  it('keeps blocked execution in received state without artifact links', () => {
    expect(
      buildBlockedRmaExecutionState({
        resolution: 'replacement',
        input: {
          rmaId,
          resolution: 'replacement',
          confirmReplacement: true,
          notes: 'Replacement blocked by missing customer account.',
        },
        userId: 'user-1',
        message: 'Source customer could not be loaded.',
        now: '2026-05-04T09:05:00.000Z',
      })
    ).toEqual({
      status: 'received',
      processedAt: null,
      processedBy: null,
      resolution: 'replacement',
      resolutionDetails: {
        resolvedAt: '2026-05-04T09:05:00.000Z',
        resolvedBy: 'user-1',
        refundAmount: undefined,
        notes: 'Replacement blocked by missing customer account.',
      },
      executionStatus: 'blocked',
      executionBlockedReason: 'Source customer could not be loaded.',
      executionCompletedAt: null,
      executionCompletedBy: null,
      refundPaymentId: null,
      creditNoteId: null,
      replacementOrderId: null,
    });
  });
});
