import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('financial query key contract', () => {
  it('includes statement pagination and sent filters', () => {
    expect(
      queryKeys.financial.statements('customer-1', {
        page: 1,
        pageSize: 10,
        onlySent: true,
      })
    ).not.toEqual(
      queryKeys.financial.statements('customer-1', {
        page: 2,
        pageSize: 10,
        onlySent: true,
      })
    );
  });

  it('includes Xero sync pagination and error filters', () => {
    expect(
      queryKeys.financial.xeroSyncs({
        status: 'error',
        errorsOnly: true,
        page: 1,
        pageSize: 50,
      })
    ).not.toEqual(
      queryKeys.financial.xeroSyncs({
        status: 'error',
        errorsOnly: true,
        page: 2,
        pageSize: 50,
      })
    );
  });

  it('includes recognition filters instead of collapsing to state only', () => {
    expect(queryKeys.financial.recognitions({ state: 'pending', page: 1 })).not.toEqual(
      queryKeys.financial.recognitions({ state: 'pending', page: 2 })
    );
    expect(
      queryKeys.financial.recognitionSummary('2026-01-01', '2026-01-31', 'week')
    ).not.toEqual(
      queryKeys.financial.recognitionSummary('2026-01-01', '2026-01-31', 'month')
    );
  });

  it('keeps reporting query roots available for scoped mutation invalidation', () => {
    expect(queryKeys.financial.arAgingReport({ bucket: 'overdue' }).slice(0, 2)).toEqual(
      queryKeys.financial.arAging()
    );
    expect(queryKeys.financial.dashboardMetrics({ includePreviousPeriod: true }).slice(0, 2)).toEqual(
      queryKeys.financial.dashboard()
    );
    expect(queryKeys.financial.outstandingInvoicesList({ page: 1 }).slice(0, 2)).toEqual(
      queryKeys.financial.outstandingInvoices()
    );
    expect(queryKeys.financial.topCustomersList({ basis: 'invoiced' }).slice(0, 2)).toEqual(
      queryKeys.financial.topCustomers()
    );
    expect(queryKeys.financial.ordersForReminders({ page: 1 }).slice(0, 3)).toEqual(
      queryKeys.financial.reminderCandidates()
    );
  });

  it('keeps overdue installment workbench keys under the payment schedule root', () => {
    const root = queryKeys.financial.paymentSchedules();
    const firstPage = queryKeys.financial.overdueInstallments({
      page: 1,
      limit: 20,
      minDaysOverdue: 1,
    });
    const secondPage = queryKeys.financial.overdueInstallments({
      page: 2,
      limit: 20,
      minDaysOverdue: 1,
    });

    expect(firstPage.slice(0, root.length)).toEqual(root);
    expect(secondPage.slice(0, root.length)).toEqual(root);
    expect(firstPage).not.toEqual(secondPage);
  });

  it('keeps Xero payment event pages under the Xero payment event root', () => {
    const rootKey = queryKeys.financial.xeroPaymentEvents();
    const firstPage = queryKeys.financial.xeroPaymentEventsList({ page: 1, pageSize: 20 });
    const secondPage = queryKeys.financial.xeroPaymentEventsList({ page: 2, pageSize: 20 });

    expect(firstPage.slice(0, rootKey.length)).toEqual(rootKey);
    expect(firstPage).toEqual([...rootKey, { page: 1, pageSize: 20 }]);
    expect(firstPage).not.toEqual(secondPage);

    const hook = read('src/hooks/financial/use-xero-sync.ts');

    expect(hook).toContain('queryKeys.financial.xeroPaymentEventsList({ page, pageSize })');
    expect(hook).not.toContain('[...queryKeys.financial.xeroPaymentEvents(), { page, pageSize }]');
  });
});
