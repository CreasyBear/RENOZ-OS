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

  it('locks payment-plan installment state before recording ledger payment', () => {
    const source = read(
      'src/server/functions/financial/_shared/payment-schedule-mutations.ts',
    );
    const lockIndex = source.indexOf(".for('update')");
    const paidStatusIndex = source.indexOf('Installment is already paid');
    const remainingDueIndex = source.indexOf('exceeds remaining due');
    const ledgerInsertIndex = source.indexOf('.insert(orderPayments)');
    const paymentGuardIndex = source.indexOf("throw new ValidationError('Payment could not be recorded')");
    const linkInsertIndex = source.indexOf('.insert(paymentSchedulePayments)');
    const linkGuardIndex = source.indexOf(
      "throw new ValidationError('Installment payment link could not be recorded')",
    );
    const scheduleUpdateIndex = source.indexOf('.update(paymentSchedules)');
    const projectionIndex = source.indexOf('await recalculateOrderFinancialProjection');

    expect(source).toContain("set_config('app.organization_id'");
    expect(source).toContain('eq(paymentSchedules.organizationId, ctx.organizationId)');
    expect(lockIndex).toBeGreaterThanOrEqual(0);
    expect(paidStatusIndex).toBeGreaterThan(lockIndex);
    expect(remainingDueIndex).toBeGreaterThan(lockIndex);
    expect(ledgerInsertIndex).toBeGreaterThan(remainingDueIndex);
    expect(paymentGuardIndex).toBeGreaterThan(ledgerInsertIndex);
    expect(linkInsertIndex).toBeGreaterThan(paymentGuardIndex);
    expect(linkGuardIndex).toBeGreaterThan(linkInsertIndex);
    expect(scheduleUpdateIndex).toBeGreaterThan(linkGuardIndex);
    expect(projectionIndex).toBeGreaterThan(scheduleUpdateIndex);
  });

  it('records Xero payment applies through a tenant-scoped ledger insert before projection', () => {
    const source = read(
      'src/server/functions/financial/_shared/xero-payment-reconciliation.ts',
    );
    const insertIndex = source.indexOf('.insert(orderPayments)');
    const guardIndex = source.indexOf("throw new ValidationError('Xero payment could not be recorded')");
    const projectionIndex = source.indexOf('await updateOrderPaymentStatus');

    expect(source).toContain("set_config('app.organization_id'");
    expect(source).toContain('.returning({ id: orderPayments.id })');
    expect(insertIndex).toBeGreaterThanOrEqual(0);
    expect(guardIndex).toBeGreaterThan(insertIndex);
    expect(projectionIndex).toBeGreaterThan(guardIndex);
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
