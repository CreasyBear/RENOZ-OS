import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getOrderPaymentDialogErrorMessage } from '@/components/domain/orders/dialogs/payment-dialog-error-messages';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('order payment dialog feedback contract', () => {
  it('sanitizes unsafe payment and refund submit failures', () => {
    expect(
      getOrderPaymentDialogErrorMessage(
        new Error('duplicate key value violates payment constraint'),
        'record-payment'
      )
    ).toBe('Unable to record payment.');

    expect(
      getOrderPaymentDialogErrorMessage(
        new Error('postgres database stack leaked'),
        'record-refund'
      )
    ).toBe('Unable to record refund.');
  });

  it('keeps safe validation guidance for payment form recovery', () => {
    expect(
      getOrderPaymentDialogErrorMessage(
        {
          statusCode: 400,
          errors: {
            amount: ['Payment amount cannot exceed the balance due.'],
          },
        },
        'record-payment'
      )
    ).toBe('Payment amount cannot exceed the balance due.');

    expect(
      getOrderPaymentDialogErrorMessage(
        {
          statusCode: 400,
          errors: {
            amount: ['Refund amount cannot exceed the refundable balance.'],
          },
        },
        'record-refund'
      )
    ).toBe('Refund amount cannot exceed the refundable balance.');
  });

  it('keeps payment dialogs behind the order-owned submit formatter', () => {
    const recordDialog = read('src/components/domain/orders/dialogs/record-payment-dialog.tsx');
    const refundDialog = read('src/components/domain/orders/dialogs/refund-payment-dialog.tsx');

    expect(recordDialog).toContain(
      'setError(getOrderPaymentDialogErrorMessage(err, "record-payment"))'
    );
    expect(refundDialog).toContain(
      'setError(getOrderPaymentDialogErrorMessage(err, "record-refund"))'
    );
    expect(recordDialog).not.toContain('setError(err.message)');
    expect(recordDialog).not.toContain('setError("Failed to record payment")');
    expect(refundDialog).not.toContain(
      'setError(err instanceof Error ? err.message : "Failed to record refund")'
    );
  });
});
