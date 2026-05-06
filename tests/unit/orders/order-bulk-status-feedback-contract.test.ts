import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createBulkOrderStatusHandledFailure,
  getBulkStatusFailureToast,
  isBulkOrderStatusHandledFailure,
  mapBulkCancellationBlockedFailures,
  mapBulkStatusFailures,
} from '@/components/domain/orders/order-bulk-status-feedback';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('order bulk status feedback contract', () => {
  it('maps structured bulk failures to order numbers and safe reasons', () => {
    const failures = mapBulkStatusFailures(
      {
        failed: [
          'order-1: Invalid status transition from \'shipped\' to \'draft\'',
          'order-2: duplicate key value violates order_status_events constraint',
          'missing-order: postgres database stack leaked',
        ],
        errorsById: {
          'order-2': 'Status was modified concurrently',
        },
      },
      [
        { id: 'order-1', orderNumber: 'SO-100' },
        { id: 'order-2', orderNumber: 'SO-101' },
      ]
    );

    expect(failures).toEqual([
      'SO-101: Status was modified concurrently. Refresh and try again.',
      "SO-100: Invalid status transition from 'shipped' to 'draft'",
      'Selected order: Status could not be updated. Review the order and try again.',
    ]);
  });

  it('keeps local cancellation blockers and partial-failure toast stable', () => {
    expect(
      mapBulkCancellationBlockedFailures([
        {
          id: 'order-1',
          orderNumber: 'SO-100',
          status: 'shipped',
        },
      ])
    ).toEqual([
      'SO-100: Cannot cancel orders with shipped quantities (process return/RMA first)',
    ]);

    expect(getBulkStatusFailureToast(1)).toBe(
      '1 order failed. Review details in the dialog.'
    );
    expect(getBulkStatusFailureToast(2)).toBe(
      '2 orders failed. Review details in the dialog.'
    );
  });

  it('uses an explicit handled-failure type instead of message string control flow', () => {
    const handled = createBulkOrderStatusHandledFailure();

    expect(isBulkOrderStatusHandledFailure(handled)).toBe(true);
    expect(isBulkOrderStatusHandledFailure(new Error('Some orders failed to update'))).toBe(
      false
    );
  });

  it('keeps orders list bulk status handling behind the feedback helper', () => {
    const source = read('src/components/domain/orders/orders-list-container.tsx');

    expect(source).toContain('mapBulkCancellationBlockedFailures(blocked)');
    expect(source).toContain('mapBulkStatusFailures(result, selectedItems)');
    expect(source).toContain('createBulkOrderStatusHandledFailure()');
    expect(source).toContain('isBulkOrderStatusHandledFailure(error)');
    expect(source).not.toContain('error.message === "Some orders failed to update"');
    expect(source).not.toContain('throw new Error("Some orders failed to update")');
  });
});
