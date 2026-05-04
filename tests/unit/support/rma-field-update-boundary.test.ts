import { describe, expect, it } from 'vitest';
import {
  rmaWorkflowOwnedUpdateFieldValues,
  updateRmaSchema,
} from '@/lib/schemas/support/rma';

describe('RMA field update boundary', () => {
  it('allows general RMA header fields', () => {
    expect(
      updateRmaSchema.parse({
        reason: 'performance_issue',
        reasonDetails: 'Battery failed load test after install.',
        customerNotes: null,
        internalNotes: 'Escalated from support issue.',
      })
    ).toEqual({
      reason: 'performance_issue',
      reasonDetails: 'Battery failed load test after install.',
      customerNotes: null,
      internalNotes: 'Escalated from support issue.',
    });
  });

  it.each(rmaWorkflowOwnedUpdateFieldValues)(
    'rejects workflow-owned field %s on general RMA update',
    (field) => {
      const valueByField = {
        inspectionNotes: { condition: 'defective' },
        resolution: 'refund',
        resolutionDetails: { refundAmount: 100 },
      } satisfies Record<(typeof rmaWorkflowOwnedUpdateFieldValues)[number], unknown>;

      const result = updateRmaSchema.safeParse({
        [field]: valueByField[field],
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'unrecognized_keys',
            keys: [field],
          }),
        ])
      );
    }
  );

  it('rejects status injection instead of silently accepting workflow transitions', () => {
    const result = updateRmaSchema.safeParse({
      status: 'processed',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unrecognized_keys',
          keys: ['status'],
        }),
      ])
    );
  });
});
