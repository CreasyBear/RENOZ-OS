import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatJobCostingReportReadError } from '@/components/domain/reports/job-costing-report-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('job costing report read feedback contract', () => {
  it('keeps job costing report read failures behind a reports formatter', () => {
    const page = read('src/components/domain/reports/job-costing-report-page.tsx');
    const helper = read('src/components/domain/reports/job-costing-report-errors.ts');
    const sharedHelper = read('src/components/domain/reports/report-read-errors.ts');
    const hook = read('src/hooks/jobs/use-job-resources.ts');

    expect(sharedHelper).toContain('formatReportReadError');
    expect(sharedHelper).toContain('isUnsafeReadMessage');
    expect(helper).toContain('formatJobCostingReportReadError');
    expect(helper).toContain('Job costing report is temporarily unavailable. Please refresh and try again.');
    expect(page).toContain('formatJobCostingReportReadError(error)');
    expect(page).toContain('reportReadErrorMessage');
    expect(page).not.toContain('error instanceof Error ? error.message');
    expect(page).not.toContain("'Failed to load report'");
    expect(hook).toContain('useJobCostingReport');
    expect(hook).toContain('queryKeys.jobCosting.list');
    expect(hook).toContain('normalizeReadQueryError(error, {');
    expect(hook).toContain("contractType: 'always-shaped'");
    expect(hook).toContain(
      "'Job costing report is temporarily unavailable. Please refresh and try again.'"
    );
  });

  it('does not surface unsafe job costing read messages', () => {
    expect(
      formatJobCostingReportReadError(
        new Error('database constraint violates job_costing_summary_idx')
      )
    ).toBe('Job costing report is temporarily unavailable. Please refresh and try again.');

    expect(
      formatJobCostingReportReadError({
        message: 'Job costing report is temporarily unavailable. Please refresh and try again.',
      })
    ).toBe('Job costing report is temporarily unavailable. Please refresh and try again.');
  });
});
