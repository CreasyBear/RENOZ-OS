import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const compact = (source: string) => source.replace(/\s+/g, '');
const countMatches = (source: string, pattern: string) =>
  source.split(pattern).length - 1;

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

  it('keeps Xero console webhook freshness explicit and route-scoped', () => {
    const hook = read('src/hooks/financial/use-xero-sync.ts');
    const page = read('src/routes/_authenticated/financial/xero-sync.tsx');

    expect(hook).toContain('refetchInterval?: number | false');
    expect(hook).toContain('refetchInterval, ...params');
    expect(hook).toContain('refetchInterval: options.refetchInterval');
    expect(page).toContain('const XERO_CONSOLE_REFETCH_INTERVAL_MS = 15 * 1000');
    expect(page).toContain('refetchInterval: XERO_CONSOLE_REFETCH_INTERVAL_MS');
    expect(page).toContain('{ refetchInterval: XERO_CONSOLE_REFETCH_INTERVAL_MS }');
  });

  it('keeps externally applied payment reporting freshness route-scoped', () => {
    const dashboardHook = read('src/hooks/financial/use-financial-dashboard.ts');
    const arAgingHook = read('src/hooks/financial/use-ar-aging.ts');
    const remindersHook = read('src/hooks/financial/use-payment-reminders.ts');
    const analyticsPage = read(
      'src/routes/_authenticated/financial/analytics/financial-analytics-page.tsx',
    );
    const arAgingPage = read('src/routes/_authenticated/financial/ar-aging.tsx');
    const financialLandingPage = read(
      'src/routes/_authenticated/financial/financial-landing-page.tsx',
    );
    const financialTriage = read(
      'src/components/domain/financial/landing/financial-triage.tsx',
    );

    expect(dashboardHook).toContain('refetchInterval?: number | false');
    expect(arAgingHook).toContain('refetchInterval?: number | false');
    expect(remindersHook).toContain('refetchInterval?: number | false');
    expect(financialTriage).toContain('refetchInterval?: number | false');

    expect(compact(dashboardHook)).toContain(
      'const{enabled=true,includePreviousPeriod=true,refetchInterval}=options;',
    );
    expect(compact(dashboardHook)).toContain(
      'const{enabled=true,refetchInterval,...params}=options;',
    );
    expect(compact(arAgingHook)).toContain(
      'const{enabled=true,refetchInterval,...filters}=options;',
    );
    expect(compact(remindersHook)).toContain(
      'const{enabled=true,refetchInterval,...params}=options;',
    );

    expect(compact(dashboardHook)).toContain(
      'queryKey:queryKeys.financial.dashboardMetrics({includePreviousPeriod}),',
    );
    expect(compact(dashboardHook)).toContain(
      'queryKey:queryKeys.financial.revenueByPeriod(params.periodType,{dateFrom:params.dateFrom,dateTo:params.dateTo,customerType:params.customerType,}),',
    );
    expect(compact(dashboardHook)).toContain(
      'queryKey:queryKeys.financial.topCustomersList({dateFrom:params.dateFrom,dateTo:params.dateTo,commercialOnly:params.commercialOnly,pageSize:params.pageSize,basis:params.basis,}),',
    );
    expect(compact(dashboardHook)).toContain(
      'queryKey:queryKeys.financial.outstandingInvoicesList({overdueOnly:params.overdueOnly,customerType:params.customerType,pageSize:params.pageSize,}),',
    );
    expect(compact(arAgingHook)).toContain(
      'queryKey:queryKeys.financial.arAgingReport(filters),',
    );
    expect(compact(remindersHook)).toContain(
      'queryKey:queryKeys.financial.ordersForReminders(params),',
    );

    expect(analyticsPage).toContain(
      'const FINANCIAL_REPORTING_REFETCH_INTERVAL_MS = 30 * 1000;',
    );
    expect(
      countMatches(
        analyticsPage,
        'refetchInterval: FINANCIAL_REPORTING_REFETCH_INTERVAL_MS',
      ),
    ).toBe(4);
    expect(arAgingPage).toContain('const AR_AGING_REFETCH_INTERVAL_MS = 30 * 1000;');
    expect(arAgingPage).toContain('refetchInterval: AR_AGING_REFETCH_INTERVAL_MS');
    expect(financialLandingPage).toContain(
      'const FINANCIAL_TRIAGE_REFETCH_INTERVAL_MS = 30 * 1000;',
    );
    expect(financialLandingPage).toContain(
      'refetchInterval={FINANCIAL_TRIAGE_REFETCH_INTERVAL_MS}',
    );
    expect(countMatches(financialTriage, 'refetchInterval,')).toBeGreaterThanOrEqual(4);
  });

  it('keeps financial read-state presenters from rendering raw query errors', () => {
    const dashboard = read('src/components/domain/financial/financial-dashboard.tsx');
    const paymentPlans = read('src/components/domain/financial/payment-plans-list.tsx');
    const creditNotesLegacy = read('src/components/domain/financial/credit-notes-list.tsx');
    const creditNotesPresenter = read(
      'src/components/domain/financial/credit-notes-list-presenter.tsx',
    );

    expect(dashboard).not.toContain('error.message');
    expect(paymentPlans).not.toContain('error.message');
    expect(creditNotesLegacy).not.toContain('error.message');
    expect(creditNotesPresenter).not.toContain('error.message');

    expect(dashboard).toContain(
      'Financial dashboard is temporarily unavailable. Please refresh and try again.',
    );
    expect(paymentPlans).toContain(
      'Payment schedule details are temporarily unavailable. Please refresh and try again.',
    );
    expect(creditNotesLegacy).toContain(
      'Credit notes are temporarily unavailable. Please refresh and try again.',
    );
    expect(creditNotesPresenter).toContain(
      'Credit notes are temporarily unavailable. Please refresh and try again.',
    );
  });
});
