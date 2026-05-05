import { describe, expect, it } from 'vitest';
import {
  formatPurchaseOrderBulkFailureReason,
  formatPurchaseOrderBulkReceiveMutationError,
  formatPurchaseOrderMutationError,
} from '@/hooks/purchase-orders/_mutation-errors';

describe('purchase order mutation errors', () => {
  it('maps known purchase-order authorization and not-found codes', () => {
    expect(
      formatPurchaseOrderMutationError(
        { statusCode: 404, code: 'NOT_FOUND' },
        'Failed to update purchase order'
      )
    ).toBe('The purchase order could not be found. Refresh and try again.');

    expect(
      formatPurchaseOrderMutationError(
        { statusCode: 403, code: 'PERMISSION_DENIED' },
        'Failed to update purchase order'
      )
    ).toBe('You do not have permission to update purchase orders.');
  });

  it('uses safe validation messages without leaking unsafe infrastructure details', () => {
    expect(
      formatPurchaseOrderMutationError(
        {
          statusCode: 400,
          errors: {
            status: ['Only draft purchase orders can be deleted.'],
          },
        },
        'Failed to delete purchase order'
      )
    ).toBe('Only draft purchase orders can be deleted.');

    expect(
      formatPurchaseOrderMutationError(
        new Error('duplicate key value violates unique constraint purchase_orders_pkey'),
        'Failed to delete purchase order'
      )
    ).toBe('Failed to delete purchase order');
  });

  it('formats per-row bulk delete failure reasons while suppressing unsafe row errors', () => {
    expect(
      formatPurchaseOrderBulkFailureReason(
        'Only draft orders can be deleted (current status: ordered)'
      )
    ).toBe('Only draft orders can be deleted (current status: ordered)');

    expect(
      formatPurchaseOrderBulkFailureReason(
        'duplicate key value violates unique constraint purchase_orders_pkey'
      )
    ).toBe('Could not delete this purchase order');
  });

  it('formats bulk receive root failures with workflow-specific safe copy', () => {
    expect(
      formatPurchaseOrderBulkReceiveMutationError({
        statusCode: 400,
        code: 'invalid_serial_state',
      })
    ).toBe(
      'Some selected purchase orders need serial-number review before receiving. Review failed rows and retry.'
    );

    expect(
      formatPurchaseOrderBulkReceiveMutationError({
        statusCode: 400,
        code: 'transition_blocked',
      })
    ).toBe('Some purchase orders were not receipted. Review failed rows and retry.');

    expect(
      formatPurchaseOrderBulkReceiveMutationError(
        new Error('duplicate key value violates unique constraint purchase_order_receipts_pkey')
      )
    ).toBe('Failed to process bulk receiving');
  });
});
