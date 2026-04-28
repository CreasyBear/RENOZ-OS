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

  it('keeps phase 3 financial ServerFn files as facades', () => {
    const facades = [
      'src/server/functions/financial/ar-aging.ts',
      'src/server/functions/financial/credit-notes.tsx',
      'src/server/functions/financial/financial-dashboard.ts',
      'src/server/functions/financial/payment-reminders.ts',
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
});
