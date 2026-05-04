import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('financial separation contract', () => {
  it('keeps the legacy financial hook as a compatibility shim', () => {
    const shim = read('src/hooks/financial/use-financial.ts');

    expect(shim).not.toContain('@/server/functions/');
    expect(shim).toContain("export * from './use-financial-dashboard'");
    expect(shim).toContain("export * from './use-payment-schedules'");
    expect(shim).toContain("export * from './use-statements'");
  });

  it('exports focused financial workflow hooks from the domain barrel', () => {
    const barrel = read('src/hooks/financial/index.ts');

    expect(barrel).toContain("export * from './use-ar-aging'");
    expect(barrel).toContain("export * from './use-revenue-recognition'");
    expect(barrel).toContain("export * from './use-xero-sync'");
    expect(barrel).toContain("export * from './use-financial'");
  });

  it('keeps payment schedule overdue writes out of the GET read path', () => {
    const server = read('src/server/functions/financial/payment-schedules.ts');
    const helper = read(
      'src/server/functions/financial/_shared/payment-schedule-overdue.ts',
    );
    const job = read('src/trigger/jobs/process-payment-schedules.ts');

    const getOverdueBody = server.slice(
      server.indexOf('export const getOverdueInstallments'),
      server.indexOf('export const refreshOverdueInstallments'),
    );

    expect(getOverdueBody).not.toContain('.update(paymentSchedules)');
    expect(getOverdueBody).not.toContain(
      'refreshPaymentScheduleOverdueStatuses',
    );
    expect(server).toContain('export const refreshOverdueInstallments');
    expect(helper).toContain(
      'export async function refreshPaymentScheduleOverdueStatuses',
    );
    expect(job).toContain('refreshPaymentScheduleOverdueStatuses');
  });

  it('keeps separated financial ServerFn files as facades', () => {
    const facades = [
      'src/server/functions/financial/ar-aging.ts',
      'src/server/functions/financial/credit-notes.tsx',
      'src/server/functions/financial/financial-dashboard.ts',
      'src/server/functions/financial/payment-reminders.ts',
      'src/server/functions/financial/revenue-recognition.ts',
      'src/server/functions/financial/xero-invoice-sync.ts',
    ];

    for (const file of facades) {
      const source = read(file);
      expect(source, `${file} should not import db directly`).not.toContain(
        "from '@/lib/db'",
      );
      expect(
        source,
        `${file} should not import Drizzle schema directly`,
      ).not.toContain("from 'drizzle/schema");
      expect(
        source,
        `${file} should not import Supabase directly`,
      ).not.toContain("from '@/lib/supabase");
      expect(
        source,
        `${file} should not import PDF rendering directly`,
      ).not.toContain("from '@/lib/documents'");
    }
  });

  it('keeps revenue and Xero retries on shared helpers instead of ServerFn-to-ServerFn calls', () => {
    const revenue = read('src/server/functions/financial/revenue-recognition.ts');
    const xero = read('src/server/functions/financial/xero-invoice-sync.ts');

    expect(revenue).toContain('syncRevenueRecognitionToXero');
    expect(revenue).not.toContain('return syncRecognitionToXero({ data:');
    expect(xero).toContain('syncInvoiceToXeroCommand');
    expect(xero).not.toContain('return syncInvoiceToXero({ data:');
  });

  it('keeps Phase 4 provider state machines in helper-owned codepaths', () => {
    const revenueSync = read(
      'src/server/functions/financial/_shared/revenue-recognition-xero-sync.ts',
    );
    const invoiceSync = read(
      'src/server/functions/financial/_shared/xero-invoice-sync-command.ts',
    );
    const invoiceStatus = read(
      'src/server/functions/financial/_shared/xero-invoice-status-read.ts',
    );

    expect(revenueSync).toContain('findManualJournalByReference');
    expect(revenueSync).toContain('manual_override');
    expect(revenueSync).toContain('MAX_SYNC_RETRIES');
    expect(invoiceSync).toContain('findInvoiceByReference');
    expect(invoiceSync).toContain("status: 'failed'");
    expect(invoiceSync).toContain("status: 'completed'");
    expect(invoiceSync).toContain('Order sync error state was saved');
    expect(invoiceStatus).toContain('normalizeXeroSyncIssue');
  });

  it('keeps Xero webhook and sync filters on provider/read helpers', () => {
    const route = read('src/routes/api/webhooks/xero.ts');
    const hook = read('src/hooks/financial/use-xero-sync.ts');
    const schema = read('src/lib/schemas/settings/xero-sync.ts');
    const invoiceStatus = read(
      'src/server/functions/financial/_shared/xero-invoice-status-read.ts',
    );
    const page = read('src/routes/_authenticated/financial/xero-sync.tsx');

    expect(route).toContain('_shared/xero-payment-reconciliation');
    expect(route).not.toContain('financial/xero-invoice-sync');
    expect(hook).toContain('issue: params.issue');
    expect(hook).toContain('customerId: params.customerId');
    expect(hook).toContain('orderId: params.orderId');
    expect(schema).toContain('issue: z.string().trim().min(1).optional()');
    expect(invoiceStatus).toContain('const { status, errorsOnly, issue, customerId, orderId');
    expect(page).not.toContain('raw.filter');
  });
});
