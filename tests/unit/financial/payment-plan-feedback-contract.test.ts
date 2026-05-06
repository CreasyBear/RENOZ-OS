import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatPaymentPlanMutationError } from '@/hooks/financial/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('payment plan mutation feedback contract', () => {
  it('formats payment plan mutation failures without leaking infrastructure details', () => {
    expect(
      formatPaymentPlanMutationError(
        {
          statusCode: 500,
          message: 'duplicate key value violates unique constraint payment_schedules_order_key',
        },
        'create'
      )
    ).toBe('Unable to create payment plan. Refresh and try again.');

    expect(
      formatPaymentPlanMutationError(
        {
          statusCode: 400,
          errors: {
            installment: ['SQL syntax error at or near "payment_schedule"'],
          },
        },
        'recordPayment'
      )
    ).toBe('Unable to record installment payment. Refresh and try again.');

    expect(
      formatPaymentPlanMutationError(
        new Error('TypeError: Cannot read properties of undefined (reading installmentId)'),
        'recordPayment'
      )
    ).toBe('Unable to record installment payment. Refresh and try again.');
  });

  it('keeps safe payment-plan workflow guidance and code messages', () => {
    expect(
      formatPaymentPlanMutationError(
        {
          statusCode: 400,
          message: 'Payment amount (A$1,500.00) exceeds remaining due (A$1,250.00)',
        },
        'recordPayment'
      )
    ).toBe('Payment amount (A$1,500.00) exceeds remaining due (A$1,250.00)');

    expect(
      formatPaymentPlanMutationError({ statusCode: 409, code: 'CONFLICT' }, 'create')
    ).toBe('Payment plan state changed. Refresh and review before trying again.');

    expect(
      formatPaymentPlanMutationError({ statusCode: 403, code: 'PERMISSION_DENIED' }, 'recordPayment')
    ).toBe('You do not have permission to manage payment plans.');
  });

  it('keeps payment plan route mutations on the formatter boundary', () => {
    const route = read('src/routes/_authenticated/financial/payment-plans.tsx');
    const index = read('src/hooks/financial/index.ts');
    const formatter = read('src/hooks/financial/_mutation-errors.ts');
    const hooks = read('src/hooks/financial/use-payment-schedules.ts');
    const server = read('src/server/functions/financial/payment-schedules.ts');
    const mutations = read('src/server/functions/financial/_shared/payment-schedule-mutations.ts');

    expect(index).toContain('formatPaymentPlanMutationError');
    expect(formatter).toContain('PAYMENT_PLAN_CODE_MESSAGES');
    expect(route).toContain("formatPaymentPlanMutationError(error, 'create')");
    expect(route).toContain("formatPaymentPlanMutationError(error, 'recordPayment')");
    expect(route).not.toContain("error.message || 'Failed to create payment plan'");
    expect(route).not.toContain("error.message || 'Failed to record payment'");

    expect(hooks).toContain('useCreatePaymentPlan');
    expect(hooks).toContain('queryKeys.financial.paymentScheduleDetail(variables.orderId)');
    expect(hooks).toContain('useRecordInstallmentPayment');
    expect(hooks).toContain('queryKeys.financial.paymentSchedules()');
    expect(server).toContain('createPaymentPlanForOrder');
    expect(server).toContain('recordPaymentScheduleInstallmentPayment');
    expect(mutations).toContain('.insert(orderPayments)');
    expect(mutations).toContain('.insert(paymentSchedulePayments)');
    expect(mutations).toContain('recalculateOrderFinancialProjection(tx');
  });
});
