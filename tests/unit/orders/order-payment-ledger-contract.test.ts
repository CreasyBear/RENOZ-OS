import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function sourceBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
}

function sourceFrom(source: string, startMarker: string): string {
  const start = source.indexOf(startMarker);

  expect(start).toBeGreaterThanOrEqual(0);

  return source.slice(start);
}

function expectActiveTenantOrderJoin(querySource: string): void {
  expect(querySource).toContain('.innerJoin(');
  expect(querySource).toContain('eq(orderPayments.orderId, orders.id)');
  expect(querySource).toContain('eq(orders.organizationId, ctx.organizationId)');
  expect(querySource).toContain('isNull(orders.deletedAt)');
}

describe('order payment ledger contract', () => {
  it('keeps payment reads pinned to the active tenant-owned order', () => {
    const source = read('src/server/functions/orders/order-payments.ts');
    const paymentListSource = sourceBetween(
      source,
      'export const getOrderPayments',
      '/**\n * Get a single payment by ID'
    );
    const paymentDetailSource = sourceBetween(
      source,
      'export const getOrderPayment',
      '/**\n * Get payment summary for an order'
    );
    const paymentSummarySource = sourceBetween(
      source,
      'export const getOrderPaymentSummary',
      '// ============================================================================\n// MUTATIONS'
    );

    expectActiveTenantOrderJoin(paymentListSource);
    expectActiveTenantOrderJoin(paymentDetailSource);
    expectActiveTenantOrderJoin(paymentSummarySource);
    expect(paymentListSource).toContain('eq(orderPayments.orderId, orderId)');
    expect(paymentDetailSource).toContain('eq(orderPayments.id, paymentId)');
    expect(paymentDetailSource).toContain('isNull(orderPayments.deletedAt)');
    expect(paymentSummarySource).toContain('eq(orderPayments.orderId, orderId)');
  });

  it('requires finance update permission before recording a real payment', () => {
    const source = read('src/server/functions/orders/order-payments.ts');
    const createPaymentSource = sourceBetween(
      source,
      'export const createOrderPayment',
      '/**\n * Update an existing payment'
    );

    expect(source).toContain('import { PERMISSIONS } from "@/lib/auth/permissions";');
    expect(createPaymentSource).toContain(
      'withAuth({ permission: PERMISSIONS.financial.update })'
    );
  });

  it('requires explicit finance permissions for payment administration mutations', () => {
    const source = read('src/server/functions/orders/order-payments.ts');
    const updatePaymentSource = sourceBetween(
      source,
      'export const updateOrderPayment',
      '/**\n * Delete a payment'
    );
    const deletePaymentSource = sourceBetween(
      source,
      'export const deleteOrderPayment',
      '/**\n * Create a refund payment'
    );
    const refundPaymentSource = sourceFrom(source, 'export const createRefundPayment');

    expect(updatePaymentSource).toContain(
      'withAuth({ permission: PERMISSIONS.financial.update })'
    );
    expect(deletePaymentSource).toContain(
      'withAuth({ permission: PERMISSIONS.financial.delete })'
    );
    expect(refundPaymentSource).toContain(
      'withAuth({ permission: PERMISSIONS.financial.update })'
    );
    expect(updatePaymentSource).not.toContain('withAuth();');
    expect(deletePaymentSource).not.toContain('withAuth();');
    expect(refundPaymentSource).not.toContain('withAuth();');
  });

  it('validates the tenant-owned order inside the transaction before ledger insert', () => {
    const source = read('src/server/functions/orders/order-payments.ts');
    const createPaymentSource = sourceBetween(
      source,
      'export const createOrderPayment',
      '/**\n * Update an existing payment'
    );

    const orderGuardIndex = createPaymentSource.indexOf('.from(orders)');
    const notFoundIndex = createPaymentSource.indexOf('throw new NotFoundError("Order not found")');
    const insertIndex = createPaymentSource.indexOf('.insert(orderPayments)');

    expect(createPaymentSource).toContain("set_config('app.organization_id'");
    expect(createPaymentSource).toContain('eq(orders.id, data.orderId)');
    expect(createPaymentSource).toContain('eq(orders.organizationId, ctx.organizationId)');
    expect(createPaymentSource).toContain('isNull(orders.deletedAt)');
    expect(orderGuardIndex).toBeGreaterThanOrEqual(0);
    expect(notFoundIndex).toBeGreaterThan(orderGuardIndex);
    expect(insertIndex).toBeGreaterThan(notFoundIndex);
  });

  it('keeps update and delete writes tenant-scoped and active-row scoped', () => {
    const source = read('src/server/functions/orders/order-payments.ts');
    const updatePaymentSource = sourceBetween(
      source,
      'export const updateOrderPayment',
      '/**\n * Delete a payment'
    );
    const deletePaymentSource = sourceBetween(
      source,
      'export const deleteOrderPayment',
      '/**\n * Create a refund payment'
    );

    const updateWriteIndex = updatePaymentSource.indexOf('.update(orderPayments)');
    const deleteWriteIndex = deletePaymentSource.indexOf('.update(orderPayments)');
    const updateWriteSource = updatePaymentSource.slice(updateWriteIndex);
    const deleteWriteSource = deletePaymentSource.slice(deleteWriteIndex);

    expect(updatePaymentSource).toContain("set_config('app.organization_id'");
    expect(deletePaymentSource).toContain("set_config('app.organization_id'");
    expect(updateWriteIndex).toBeGreaterThanOrEqual(0);
    expect(deleteWriteIndex).toBeGreaterThanOrEqual(0);
    expect(updateWriteSource).toContain('eq(orderPayments.id, id)');
    expect(updateWriteSource).toContain('eq(orderPayments.organizationId, ctx.organizationId)');
    expect(updateWriteSource).toContain('isNull(orderPayments.deletedAt)');
    expect(deleteWriteSource).toContain('eq(orderPayments.id, id)');
    expect(deleteWriteSource).toContain('eq(orderPayments.organizationId, ctx.organizationId)');
    expect(deleteWriteSource).toContain('isNull(orderPayments.deletedAt)');
    expect(updateWriteSource).toContain(
      'throw new NotFoundError("Payment not found or update failed")'
    );
    expect(deleteWriteSource).toContain(
      'throw new NotFoundError("Payment not found or delete failed")'
    );
  });

  it('keeps refund writes tenant-scoped after proving the original payment', () => {
    const source = read('src/server/functions/orders/order-payments.ts');
    const refundPaymentSource = sourceFrom(source, 'export const createRefundPayment');

    const transactionIndex = refundPaymentSource.indexOf('return db.transaction(async (tx) => {');
    const originalGuardIndex = refundPaymentSource.indexOf('.from(orderPayments)');
    const originalLockIndex = refundPaymentSource.indexOf('.for("update")');
    const refundTotalsIndex = refundPaymentSource.indexOf('const [refundTotals] = await tx');
    const validationIndex = refundPaymentSource.indexOf('if (amount > remainingRefundable)');
    const refundInsertIndex = refundPaymentSource.indexOf('.insert(orderPayments)');

    expect(refundPaymentSource).toContain('eq(orderPayments.id, originalPaymentId)');
    expect(refundPaymentSource).toContain('eq(orderPayments.orderId, orderId)');
    expect(refundPaymentSource).toContain('eq(orderPayments.organizationId, ctx.organizationId)');
    expect(refundPaymentSource).toContain('eq(orderPayments.isRefund, false)');
    expect(refundPaymentSource).toContain('isNull(orderPayments.deletedAt)');
    expect(refundPaymentSource).toContain("set_config('app.organization_id'");
    expect(transactionIndex).toBeGreaterThanOrEqual(0);
    expect(originalGuardIndex).toBeGreaterThan(transactionIndex);
    expect(originalLockIndex).toBeGreaterThan(originalGuardIndex);
    expect(refundTotalsIndex).toBeGreaterThan(originalLockIndex);
    expect(validationIndex).toBeGreaterThan(refundTotalsIndex);
    expect(originalGuardIndex).toBeGreaterThanOrEqual(0);
    expect(refundInsertIndex).toBeGreaterThan(validationIndex);
  });

  it('keeps invoice payment recording on the order payment mutation spine', () => {
    const invoiceDetail = read('src/components/domain/invoices/detail/invoice-detail-container.tsx');
    const orderPaymentHook = read('src/hooks/orders/use-order-payments.ts');
    const createPaymentHookSource = sourceBetween(
      orderPaymentHook,
      'export function useCreateOrderPayment',
      '/**\n * Hook to update an existing payment'
    );

    expect(invoiceDetail).toContain('const createOrderPayment = useCreateOrderPayment(invoiceId);');
    expect(invoiceDetail).toContain('await createOrderPayment.mutateAsync(data);');
    expect(invoiceDetail).toContain('<RecordPaymentDialog');
    expect(createPaymentHookSource).toContain('queryKeys.orders.payments(orderId)');
    expect(createPaymentHookSource).toContain('[...queryKeys.orders.payments(orderId), "summary"]');
    expect(createPaymentHookSource).toContain('queryKeys.orders.detail(orderId)');
    expect(createPaymentHookSource).toContain('queryKeys.invoices.detail(orderId)');
    expect(createPaymentHookSource).toContain('queryKeys.invoices.lists()');
    expect(createPaymentHookSource).toContain('queryKeys.invoices.summary()');
  });
});
