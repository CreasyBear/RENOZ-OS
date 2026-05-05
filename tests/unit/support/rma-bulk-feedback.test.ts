import { describe, expect, it } from 'vitest';
import {
  buildRmaBulkFailureItems,
  formatRmaBulkFailureMessage,
  formatRmaBulkFailureToast,
  formatRmaBulkMutationError,
} from '@/components/domain/support/rma/rma-bulk-feedback';

describe('RMA bulk feedback formatting', () => {
  it('keeps safe per-RMA failure messages and labels selected rows', () => {
    const failures = buildRmaBulkFailureItems(
      'approve',
      [
        { rmaId: 'rma-1', error: "Cannot approve: RMA is in 'approved' status" },
        { rmaId: 'rma-2', error: 'RMA not found' },
      ],
      [{ id: 'rma-1', rmaNumber: 'RMA-001' }]
    );

    expect(failures).toEqual([
      {
        rmaId: 'rma-1',
        rmaLabel: 'RMA-001',
        message: "Cannot approve: RMA is in 'approved' status",
      },
      {
        rmaId: 'rma-2',
        rmaLabel: 'rma-2',
        message: 'RMA not found',
      },
    ]);
    expect(formatRmaBulkFailureToast(failures)).toBe(
      "2 failed: RMA-001: Cannot approve: RMA is in 'approved' status | rma-2: RMA not found"
    );
  });

  it('suppresses unsafe per-RMA and top-level mutation messages', () => {
    expect(
      formatRmaBulkFailureMessage(
        'receive',
        'duplicate key value violates unique constraint inventory_serial_idx'
      )
    ).toBe('Unable to receive this RMA. Refresh and retry.');

    expect(
      formatRmaBulkMutationError(
        {
          statusCode: 500,
          message: 'internal server error: database stack trace',
        },
        'Failed to receive RMAs'
      )
    ).toBe('Failed to receive RMAs');
  });
});
