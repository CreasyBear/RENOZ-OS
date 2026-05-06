import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatReportsMutationError } from '@/hooks/reports';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('warranty analytics generated-report feedback contract', () => {
  it('formats generated PDF/Excel failures before display', () => {
    const page = read('src/components/domain/reports/warranty-analytics-page.tsx');
    const reportsHooks = read('src/hooks/reports/index.ts');
    const reportsFormatter = read('src/hooks/reports/_mutation-errors.ts');
    const scheduledReportsHook = read('src/hooks/reports/use-scheduled-reports.ts');
    const server = read('src/server/functions/reports/scheduled-reports.ts');
    const schema = read('src/lib/schemas/reports/scheduled-reports.ts');

    expect(page).toContain('formatReportsMutationError');
    expect(page).toContain('WARRANTY_ANALYTICS_GENERATED_REPORT_ERROR_MESSAGES');
    expect(page).toContain(
      "PERMISSION_DENIED: 'You do not have permission to generate warranty analytics reports.'"
    );
    expect(page).toContain('formatGeneratedWarrantyAnalyticsReportError(error, format)');
    expect(page).toContain(
      '${format.toUpperCase()} warranty analytics report generation is temporarily unavailable. Please refresh and try again.'
    );
    expect(page).toContain("window.open(result.reportUrl, '_blank', 'noopener,noreferrer')");
    expect(page).toContain('toast.error(formatGeneratedWarrantyAnalyticsReportError(error, format));');
    expect(page).not.toContain('// keep UI quiet; caller can toast');
    expect(page).not.toContain('.catch(() => {');

    expect(reportsHooks).toContain("export { formatReportsMutationError } from './_mutation-errors';");
    expect(reportsFormatter).toContain('formatReportsMutationError');
    expect(reportsFormatter).not.toContain('formatWarrantyMutationError');
    expect(scheduledReportsHook).toContain('useGenerateReport');
    expect(scheduledReportsHook).toContain('const generateFn = useServerFn(generateReport)');
    expect(scheduledReportsHook).toContain('generateFn({ data: input })');
    expect(server).toContain('export const generateReport');
    expect(server).toContain('generateReportSchema');
    expect(server).toContain('withAuth({ permission: PERMISSIONS.dashboard.manageReports })');
    expect(server).toContain('uploadFile({');
    expect(server).toContain('createSignedUrl({');
    expect(schema).toContain('generateReportSchema');
    expect(schema).toContain('generateReportResponseSchema');
  });

  it('keeps unsafe generated-report mutation messages behind fallback copy', () => {
    expect(
      formatReportsMutationError(
        { message: 'database connection failed', statusCode: 500 },
        'Report generation is temporarily unavailable.'
      )
    ).toBe('Report generation is temporarily unavailable.');

    expect(
      formatReportsMutationError(
        { code: 'PERMISSION_DENIED' },
        'Report generation is temporarily unavailable.'
      )
    ).toBe('You do not have permission to manage this report.');
  });

  it('keeps implementation-shaped report mutation messages behind fallback copy', () => {
    expect(
      formatReportsMutationError(
        {
          message: 'TypeError: Cannot read properties of undefined (reading reportDefinition)',
          statusCode: 400,
        },
        'Report generation is temporarily unavailable.'
      )
    ).toBe('Report generation is temporarily unavailable.');

    expect(
      formatReportsMutationError(
        {
          statusCode: 400,
          errors: {
            metric: ['SQL syntax error at or near "gross_margin"'],
          },
        },
        'Report generation is temporarily unavailable.'
      )
    ).toBe('Report generation is temporarily unavailable.');
  });
});
