import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatFinancialSummaryReadError } from '@/components/domain/reports/financial-summary-report-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('financial summary read feedback contract', () => {
  it('keeps financial summary read failures honest and behind a reports formatter', () => {
    const page = read('src/components/domain/reports/financial-summary-page.tsx');
    const helper = read('src/components/domain/reports/financial-summary-report-errors.ts');
    const sharedHelper = read('src/components/domain/reports/report-read-errors.ts');
    const hook = read('src/hooks/reports/use-financial-summary.ts');

    expect(sharedHelper).toContain('formatReportReadError');
    expect(helper).toContain('formatFinancialSummaryReadError');
    expect(helper).toContain('Financial summary is temporarily unavailable. Please refresh and try again.');
    expect(page).toContain('const { data, isLoading, error, refetch } = useFinancialSummaryReport({');
    expect(page).toContain('formatFinancialSummaryReadError(error)');
    expect(page).toContain('if (error && !data)');
    expect(page).toContain('Financial summary unavailable');
    expect(page).toContain('Showing cached financial summary');
    expect(page.indexOf('if (error && !data)')).toBeLessThan(page.indexOf('if (!data)'));
    expect(hook).toContain('queryKeys.reports.financialSummary(fromStr, toStr, periodType)');
    expect(hook).toContain('requireReadResult(result, {');
    expect(hook).toContain("contractType: 'always-shaped'");
    expect(hook).toContain('normalizeReadQueryError(error, {');
  });

  it('does not surface unsafe financial summary read messages', () => {
    expect(
      formatFinancialSummaryReadError(
        new Error('postgres duplicate key violates financial_summary_org_idx')
      )
    ).toBe('Financial summary is temporarily unavailable. Please refresh and try again.');

    expect(
      formatFinancialSummaryReadError({
        message: 'Financial summary is temporarily unavailable. Please refresh and try again.',
      })
    ).toBe('Financial summary is temporarily unavailable. Please refresh and try again.');
  });
});
