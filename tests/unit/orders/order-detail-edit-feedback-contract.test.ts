import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getOrderEditSubmitErrorMessage } from '@/hooks/orders/order-edit-action-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('order detail edit feedback contract', () => {
  it('formats edit-submit failures through the orders mutation contract', () => {
    expect(getOrderEditSubmitErrorMessage(null)).toBeNull();

    expect(
      getOrderEditSubmitErrorMessage({
        statusCode: 400,
        errors: {
          dueDate: ['Due date cannot be in the past.'],
        },
      })
    ).toBe('Due date cannot be in the past.');

    expect(
      getOrderEditSubmitErrorMessage(
        new Error('duplicate key value violates unique constraint orders_order_number_key')
      )
    ).toBe('Unable to update order.');

    expect(
      getOrderEditSubmitErrorMessage({
        statusCode: 409,
        code: 'CONFLICT',
        message: 'Order was changed by another user',
      })
    ).toBe('Order was changed by another user');
  });

  it('keeps order edit dialog submit feedback behind the helper', () => {
    const container = read('src/components/domain/orders/containers/order-detail-container.tsx');

    expect(container).toContain(
      'submitError={getOrderEditSubmitErrorMessage(containerActions.updateOrderMutation.error)}'
    );
    expect(container).not.toContain('submitError={containerActions.updateOrderMutation.error?.message}');
  });
});
