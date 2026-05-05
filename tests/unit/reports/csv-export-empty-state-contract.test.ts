import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('reports CSV export empty-state contract', () => {
  it('keeps local CSV exports honest when there is no data to download', () => {
    const expiring = read('src/components/domain/reports/expiring-warranties-container.tsx');
    const jobCosting = read('src/components/domain/reports/job-costing-report-page.tsx');
    const procurement = read('src/components/domain/reports/procurement-reports-page.tsx');
    const customer = read('src/components/domain/reports/customer-reports-page.tsx');

    expect(expiring).toContain("if (format === 'csv') {");
    expect(expiring).toContain("toast.error('No expiring warranties to export')");
    expect(expiring).toContain("toast.success('Expiring warranties exported as CSV')");
    expect(expiring).toContain('downloadCSV(csv, `expiring-warranties-${date}.csv`)');
    expect(expiring).not.toContain("if (!warranties.length && format === 'csv') return;");

    expect(jobCosting).toContain("toast.error(\n          format === 'csv'");
    expect(jobCosting).toContain("'No job costing rows to export'");
    expect(jobCosting).toContain("'Job costing report data is not available yet. Refresh and try again.'");
    expect(jobCosting).toContain("toast.success('Job costing report exported as CSV')");
    expect(jobCosting).toContain('URL.createObjectURL(blob)');
    expect(jobCosting).not.toContain('if (!reportData?.jobs.length) return;');

    expect(procurement).toContain("toast.error('No data to export')");
    expect(procurement).toContain("toast.success('Procurement report exported as CSV')");
    expect(customer).toContain("toast.error('No data to export')");
    expect(customer).toContain("toast.success('Customer report exported as CSV')");
  });

  it('keeps the local CSV export read spine explicit', () => {
    const expiring = read('src/components/domain/reports/expiring-warranties-container.tsx');
    const expiringHook = read('src/hooks/warranty/core/use-expiring-warranties.ts');
    const jobCosting = read('src/components/domain/reports/job-costing-report-page.tsx');
    const jobCostingHook = read('src/hooks/jobs/use-job-resources.ts');
    const queryKeys = read('src/lib/query-keys.ts');

    expect(expiring).toContain('useExpiringWarrantiesReport({');
    expect(expiring).toContain('data?.warranties ?? []');
    expect(expiringHook).toContain('useExpiringWarrantiesReport');
    expect(expiringHook).toContain('queryKeys.expiringWarrantiesReport.list');

    expect(jobCosting).toContain('useJobCostingReport({');
    expect(jobCosting).toContain('reportData?.jobs.length');
    expect(jobCostingHook).toContain('useJobCostingReport');
    expect(jobCostingHook).toContain('queryKeys.jobCosting.list');

    expect(queryKeys).toContain('expiringWarrantiesReport:');
    expect(queryKeys).toContain('jobCosting: {');
  });
});
