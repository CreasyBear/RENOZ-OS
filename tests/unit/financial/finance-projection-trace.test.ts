import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('finance schema trace repair', () => {
  it('projects order balances from payments and applied credits', () => {
    const source = read(
      'src/server/functions/financial/_shared/order-financial-projection.ts',
    );

    expect(source).toContain('orderPayments');
    expect(source).toContain('creditNotes');
    expect(source).toContain("eq(creditNotes.status, 'applied')");
    expect(source).toContain('paidAmount: cashPaidAmount');
    expect(source).toContain('balanceDue');
  });

  it('records payment-plan payments through the real payment ledger and link table', () => {
    const source = read(
      'src/server/functions/financial/_shared/payment-schedule-mutations.ts',
    );

    expect(source).toContain('.insert(orderPayments)');
    expect(source).toContain('.insert(paymentSchedulePayments)');
    expect(source).toContain('recalculateOrderFinancialProjection');
  });

  it('blocks paid invoice status writes and keeps invoice detail off fake payment math', () => {
    const statusSource = read(
      'src/server/functions/invoices/update-invoice-status.ts',
    );
    const detailSource = read(
      'src/components/domain/invoices/detail/invoice-detail-view.tsx',
    );

    expect(statusSource).toContain(
      'Paid invoices must be created by recording a real payment',
    );
    expect(statusSource).not.toContain("paymentStatus = 'paid'");
    expect(detailSource).not.toContain('total - balanceDue');
    expect(detailSource).toContain('cashPaidAmount');
  });

  it('keeps credit notes as adjustments instead of cash payments', () => {
    const source = read(
      'src/server/functions/financial/_shared/credit-note-mutations.ts',
    );

    expect(source).toContain('recalculateOrderFinancialProjection');
    expect(source).not.toContain('newPaidAmount = currentPaid + creditAmount');
  });
});
