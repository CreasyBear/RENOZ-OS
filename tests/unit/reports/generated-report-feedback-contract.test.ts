import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatGeneratedReportError } from '@/hooks/reports';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

const generatedReportPages = [
  {
    path: 'src/components/domain/reports/pipeline-forecast-page.tsx',
    reportName: 'pipeline forecast report',
  },
  {
    path: 'src/components/domain/reports/procurement-reports-page.tsx',
    reportName: 'procurement report',
  },
  {
    path: 'src/components/domain/reports/customer-reports-page.tsx',
    reportName: 'customer report',
  },
  {
    path: 'src/components/domain/reports/expiring-warranties-container.tsx',
    reportName: 'expiring warranties report',
  },
  {
    path: 'src/components/domain/reports/win-loss-analysis-container.tsx',
    reportName: 'win/loss analysis report',
  },
  {
    path: 'src/components/domain/reports/job-costing-report-page.tsx',
    reportName: 'job costing report',
  },
] as const;

describe('generated report feedback contract', () => {
  it('surfaces sanitized PDF/Excel generation failures across report pages', () => {
    const reportsHooks = read('src/hooks/reports/index.ts');
    const reportsFormatter = read('src/hooks/reports/_mutation-errors.ts');

    expect(reportsHooks).toContain("export { formatGeneratedReportError } from './_mutation-errors';");
    expect(reportsFormatter).toContain('formatGeneratedReportError');
    expect(reportsFormatter).toContain('GENERATED_REPORT_CODE_MESSAGES');
    expect(reportsFormatter).toContain('You do not have permission to generate reports.');

    for (const { path, reportName } of generatedReportPages) {
      const source = read(path);

      expect(source).toContain('formatGeneratedReportError');
      expect(source).toContain(reportName);
      expect(source).toContain('window.open(result.reportUrl');
      expect(source).toContain('noopener,noreferrer');
      expect(source).toContain('toast.error(formatGeneratedReportError(error,');
      expect(source).toContain('.catch((error: unknown) => {');
      expect(source).not.toContain('keep UI quiet');
      expect(source).not.toContain('Keep UI quiet');
      expect(source).not.toContain('.catch(() => {');
    }
  });

  it('keeps financial summary generated exports on the reports formatter', () => {
    const page = read('src/components/domain/reports/financial-summary-page.tsx');
    const hook = read('src/hooks/reports/use-financial-summary.ts');
    const server = read('src/server/functions/reports/financial-summary.ts');
    const schema = read('src/lib/schemas/reports/financial-summary.ts');

    expect(page).toContain('formatGeneratedReportError');
    expect(page).toContain("'financial summary report'");
    expect(page).toContain("window.open(result.reportUrl, '_blank', 'noopener,noreferrer')");
    expect(page).toContain('onError: (error: unknown) => {');
    expect(page).toContain("toast.error(formatGeneratedReportError(error, 'financial summary report', exportFormat));");
    expect(page).not.toContain("window.open(result.reportUrl, '_blank');");
    expect(page).not.toContain("toast.error('Failed to export report')");

    expect(hook).toContain('useExportFinancialSummaryReport');
    expect(hook).toContain('generateFinancialSummaryReport({ data: input })');
    expect(server).toContain('generateFinancialSummaryReport');
    expect(server).toContain('generateFinancialSummaryReportSchema');
    expect(server).toContain('withAuth({ permission: PERMISSIONS.report.viewFinancial })');
    expect(server).toContain('uploadFile({');
    expect(server).toContain('createSignedUrl({');
    expect(schema).toContain('generateFinancialSummaryReportSchema');
  });

  it('formats generated report errors without leaking unsafe internals', () => {
    expect(
      formatGeneratedReportError(
        { message: 'database connection failed', statusCode: 500 },
        'pipeline forecast report',
        'pdf'
      )
    ).toBe('PDF pipeline forecast report generation is temporarily unavailable. Please refresh and try again.');

    expect(
      formatGeneratedReportError(
        { code: 'PERMISSION_DENIED' },
        'pipeline forecast report',
        'excel'
      )
    ).toBe('You do not have permission to generate reports.');
  });
});
