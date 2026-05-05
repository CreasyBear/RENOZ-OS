import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatProcurementAnalyticsReadError } from '@/components/domain/reports/procurement-report-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('procurement analytics read feedback contract', () => {
  it('keeps procurement report read failures behind a domain formatter', () => {
    const page = read('src/components/domain/reports/procurement-reports-page.tsx');
    const presenter = read('src/components/domain/reports/procurement-reports.tsx');
    const helper = read('src/components/domain/reports/procurement-report-errors.ts');
    const hook = read('src/hooks/suppliers/use-procurement-analytics.ts');

    expect(helper).toContain('formatProcurementAnalyticsReadError');
    expect(helper).toContain('Procurement analytics are temporarily unavailable. Please refresh and try again.');
    expect(page).toContain('formatProcurementAnalyticsReadError(error)');
    expect(presenter).toContain('formatProcurementAnalyticsReadError(error)');
    expect(presenter).not.toContain('{error.message}');
    expect(hook).toContain('useProcurementDashboard');
    expect(hook).toContain('normalizeReadQueryError(error, {');
    expect(hook).toContain("contractType: 'always-shaped'");
    expect(hook).toContain(
      "'Procurement analytics are temporarily unavailable. Please refresh and try again.'"
    );
  });

  it('does not surface unsafe procurement analytics read messages', () => {
    expect(
      formatProcurementAnalyticsReadError(
        new Error('postgres duplicate key violates constraint procurement_dashboard_idx')
      )
    ).toBe('Procurement analytics are temporarily unavailable. Please refresh and try again.');

    expect(
      formatProcurementAnalyticsReadError({
        message: 'Procurement analytics are temporarily unavailable. Please refresh and try again.',
      })
    ).toBe('Procurement analytics are temporarily unavailable. Please refresh and try again.');
  });
});
