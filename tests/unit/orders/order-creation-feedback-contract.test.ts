import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getOrderCreationFieldErrors,
  getOrderCreationSubmitErrorMessage,
} from '@/components/domain/orders/creation/order-creation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('order creation feedback contract', () => {
  it('sanitizes unsafe create-order failures', () => {
    expect(
      getOrderCreationSubmitErrorMessage(
        new Error('duplicate key value violates orders_client_request_id constraint')
      )
    ).toBe('Unable to create order.');

    expect(getOrderCreationSubmitErrorMessage(new Error('postgres database stack leaked'))).toBe(
      'Unable to create order.'
    );
  });

  it('keeps safe local validation and conflict guidance', () => {
    expect(getOrderCreationSubmitErrorMessage(new Error('At least one item is required'))).toBe(
      'At least one item is required'
    );

    expect(
      getOrderCreationSubmitErrorMessage(
        new Error('Line item "Battery pack": discount cannot exceed line total')
      )
    ).toBe('Line item "Battery pack": discount cannot exceed line total');

    const conflict = getOrderCreationSubmitErrorMessage({
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Order was already created from this request. Please refresh and try again.',
    });

    expect(conflict).toContain('refresh');
  });

  it('filters unsafe field errors before the wizard renders them', () => {
    expect(
      getOrderCreationFieldErrors({
        fieldErrors: {
          customerId: ['Customer is required'],
          lineItems: ['duplicate key violates order_line_items constraint'],
          shippingAddress: ['Shipping city is required'],
        },
      })
    ).toEqual({
      customerId: 'Customer is required',
      shippingAddress: 'Shipping city is required',
    });
  });

  it('keeps order creation submit feedback behind the formatter', () => {
    const source = read('src/components/domain/orders/creation/order-creation-wizard.tsx');

    expect(source).toContain('getOrderCreationSubmitErrorMessage(error)');
    expect(source).toContain('getOrderCreationFieldErrors(error)');
    expect(source).toContain('getStepFromErrorMessage(message)');
    expect(source).not.toContain('error instanceof Error ? error.message : "Failed to create order"');
    expect(source).not.toContain('const msg = error instanceof Error ? error.message.toLowerCase()');
  });
});
