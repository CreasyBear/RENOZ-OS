import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getDraftOrderItemActionErrorMessage,
  isDraftOrderItemConflictMessage,
} from '@/components/domain/orders/tabs/order-item-action-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('order item action feedback contract', () => {
  it('sanitizes unsafe draft item mutation failures', () => {
    expect(
      getDraftOrderItemActionErrorMessage(
        new Error('duplicate key value violates order line item constraint'),
        'add'
      )
    ).toBe('Unable to add items to draft order.');

    expect(
      getDraftOrderItemActionErrorMessage(new Error('postgres database stack leaked'), 'remove')
    ).toBe('Unable to remove draft line item.');

    expect(
      getDraftOrderItemActionErrorMessage(
        new Error(
          'duplicate key violates stock constraint but "Battery pack" must have a quantity greater than 0.'
        ),
        'update'
      )
    ).toBe('Unable to update draft line item.');
  });

  it('keeps safe local validation and conflict guidance', () => {
    expect(
      getDraftOrderItemActionErrorMessage(
        new Error('"Battery pack" must have a quantity greater than 0.'),
        'update'
      )
    ).toBe('"Battery pack" must have a quantity greater than 0.');

    const conflict = getDraftOrderItemActionErrorMessage(
      {
        statusCode: 409,
        code: 'CONFLICT',
        message: 'Order was modified by another user. Please refresh and try again.',
      },
      'update'
    );

    expect(conflict).toContain('refresh');
    expect(isDraftOrderItemConflictMessage(conflict)).toBe(true);
  });

  it('keeps draft item actions behind the order-owned formatter', () => {
    const source = read('src/components/domain/orders/tabs/order-items-tab.tsx');

    expect(source).toContain("getDraftOrderItemActionErrorMessage(error, 'add')");
    expect(source).toContain("getDraftOrderItemActionErrorMessage(error, 'update')");
    expect(source).toContain("getDraftOrderItemActionErrorMessage(error, 'remove')");
    expect(source).toContain('isDraftOrderItemConflictMessage(message)');
    expect(source).not.toContain(
      "error instanceof Error ? error.message : 'Unable to add items to draft order.'"
    );
    expect(source).not.toContain(
      "error instanceof Error ? error.message : 'Unable to update draft line item.'"
    );
    expect(source).not.toContain(
      "error instanceof Error ? error.message : 'Unable to remove draft line item.'"
    );
  });
});
