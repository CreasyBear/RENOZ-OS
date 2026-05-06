import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildXeroPaymentEventRecord } from '@/server/functions/financial/_shared/xero-payment-event-read';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('xero payment event read contract', () => {
  it('returns an operator-safe audit record without raw Xero payment identifiers', () => {
    const result = buildXeroPaymentEventRecord({
      id: 'event-1',
      orderId: null,
      dedupeKey: 'payment:payment-secret-1',
      xeroInvoiceId: 'invoice-secret-1',
      paymentId: 'payment-secret-1',
      amount: '104.40',
      paymentDate: '2026-04-01',
      reference: 'PAY-1',
      resultState: 'unknown_invoice',
      processedAt: new Date('2026-04-01T02:00:00.000Z'),
    });

    expect(result).toMatchObject({
      eventKeyLabel: 'Payment event recorded',
      xeroInvoiceLabel: 'Unmatched Xero invoice',
      paymentSourceLabel: 'Recorded Xero payment',
      amount: 104.4,
      reference: 'PAY-1',
      resultState: 'unknown_invoice',
      payloadSummary: {
        source: 'xero_payment_event',
        invoice: {
          status: 'Unmatched Xero invoice',
          linkedOrder: false,
        },
        payment: {
          status: 'Recorded Xero payment',
          date: '2026-04-01',
          reference: 'PAY-1',
        },
        handling: {
          state: 'unknown_invoice',
          message: 'No local order matched this Xero invoice ID.',
        },
      },
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('payment-secret-1');
    expect(serialized).not.toContain('invoice-secret-1');
    expect(serialized).not.toContain('payment:payment-secret-1');
  });

  it('keeps linked applied events useful without returning raw dedupe keys', () => {
    const result = buildXeroPaymentEventRecord({
      id: 'event-2',
      orderId: 'order-1',
      dedupeKey: 'payment:invoice-secret-2:2026-04-02:50.00:REF-2',
      xeroInvoiceId: 'invoice-secret-2',
      paymentId: null,
      amount: 50,
      paymentDate: '2026-04-02',
      reference: 'REF-2',
      resultState: 'applied',
      processedAt: new Date('2026-04-02T02:00:00.000Z'),
    });

    expect(result).toMatchObject({
      orderId: 'order-1',
      eventKeyLabel: 'Payment event recorded',
      xeroInvoiceLabel: 'Matched Xero invoice',
      paymentSourceLabel: 'Payment resource unavailable',
      payloadSummary: {
        invoice: {
          status: 'Matched Xero invoice',
          linkedOrder: true,
        },
        payment: {
          status: 'Payment resource unavailable',
          reference: 'REF-2',
        },
      },
    });

    expect(JSON.stringify(result)).not.toContain('invoice-secret-2');
    expect(JSON.stringify(result)).not.toContain('payment:invoice-secret-2');
  });

  it('keeps payment event UI and server reads behind the safe read-model mapper', () => {
    const operations = read('src/server/functions/financial/xero-operations.ts');
    const statusUi = read('src/components/domain/financial/xero-sync-status.tsx');

    expect(operations).toContain('buildXeroPaymentEventRecord');
    expect(operations).not.toContain('payload: xeroPaymentEvents.payload');
    expect(operations).not.toContain('payloadSummary:');
    expect(statusUi).not.toContain('JSON.stringify(event.payloadSummary');
    expect(statusUi).not.toContain('Payment ID / dedupe key');
    expect(statusUi).not.toContain('exact dedupe key');
    expect(statusUi).toContain('event.payloadSummary.payment.status');
  });
});
