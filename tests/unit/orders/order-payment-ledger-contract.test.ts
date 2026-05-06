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

describe('order payment ledger contract', () => {
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
