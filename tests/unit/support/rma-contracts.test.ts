import { describe, expect, it } from 'vitest';

import {
  getRmaLookupSchema,
  listRmasSchema,
  rmaStatusSchema,
} from '@/lib/schemas/support/rma';
import {
  getRmaExecutionStageLabel,
  RMA_STATUS_OPTIONS,
} from '@/components/domain/support/rma/rma-options';

describe('rma contract normalization', () => {
  it('accepts cancelled as a first-class public status', () => {
    expect(rmaStatusSchema.safeParse('cancelled').success).toBe(true);
    expect(listRmasSchema.safeParse({ status: 'cancelled' }).success).toBe(true);
    expect(RMA_STATUS_OPTIONS.some((option) => option.value === 'cancelled')).toBe(true);
  });

  it('treats cancelled RMAs as a terminal execution stage', () => {
    expect(
      getRmaExecutionStageLabel({
        status: 'cancelled',
        execution: {
          status: 'pending',
          blockedReason: null,
          refundPayment: null,
          creditNote: null,
          replacementOrder: null,
          linkedIssueOpen: null,
          completedAt: null,
          completedBy: null,
        },
      })
    ).toBe('Cancelled');
  });

  it('accepts lookup by either rmaId or a real rmaNumber', () => {
    expect(getRmaLookupSchema.safeParse({ rmaId: crypto.randomUUID() }).success).toBe(true);
    expect(getRmaLookupSchema.safeParse({ rmaNumber: 'RMA-000123' }).success).toBe(true);
    expect(getRmaLookupSchema.safeParse({ rmaNumber: '  RMA-000123  ' }).success).toBe(true);
    expect(getRmaLookupSchema.safeParse({}).success).toBe(false);
    expect(getRmaLookupSchema.safeParse({ rmaNumber: '' }).success).toBe(false);
  });
});
