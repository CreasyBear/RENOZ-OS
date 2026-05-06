import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatCustomReportMutationError } from '@/hooks/reports';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('custom report feedback contract', () => {
  it('formats procurement custom-report creation failures before display', () => {
    const page = read('src/components/domain/reports/procurement-reports-page.tsx');
    const reportsHooks = read('src/hooks/reports/index.ts');
    const reportsFormatter = read('src/hooks/reports/_mutation-errors.ts');

    expect(reportsHooks).toContain(
      "export { formatCustomReportMutationError } from './_mutation-errors';"
    );
    expect(reportsFormatter).toContain('formatCustomReportMutationError');
    expect(reportsFormatter).toContain('CUSTOM_REPORT_CODE_MESSAGES');
    expect(reportsFormatter).toContain('You do not have permission to manage custom reports.');

    expect(page).toContain('formatCustomReportMutationError');
    expect(page).toContain('handleCreateCustomReport');
    expect(page).toContain('catch (error)');
    expect(page).toContain(
      "'Custom report creation is temporarily unavailable. Please refresh and try again.'"
    );
    expect(page).not.toContain("toast.error('Failed to create custom report')");
    expect(page).not.toContain('catch {');
  });

  it('keeps the custom-report create spine and cache policy explicit', () => {
    const page = read('src/components/domain/reports/procurement-reports-page.tsx');
    const hook = read('src/hooks/reports/use-custom-reports.ts');
    const server = read('src/server/functions/reports/custom-reports.ts');
    const schema = read('src/lib/schemas/reports/custom-reports.ts');
    const queryKeys = read('src/lib/query-keys.ts');

    expect(page).toContain('useCreateCustomReport');
    expect(page).toContain('definition: {');
    expect(page).toContain("source: 'procurement'");
    expect(page).toContain('getColumnsForProcurementReport(input.reportType)');

    expect(hook).toContain('useCreateCustomReport');
    expect(hook).toContain('createFn({ data: input })');
    expect(hook).toContain('queryKeys.reports.customReports.detail(result.id)');
    expect(hook).toContain('queryKeys.reports.customReports.lists()');

    expect(server).toContain('export const createCustomReport');
    expect(server).toContain('createCustomReportSchema');
    expect(server).toContain('withAuth({ permission: PERMISSIONS.report.export })');
    expect(server).toContain('organizationId: ctx.organizationId');
    expect(schema).toContain('createCustomReportSchema');
    expect(schema).toContain('reportDefinitionSchema');
    expect(queryKeys).toContain('customReports: {');
    expect(queryKeys).toContain("all: () => [...queryKeys.reports.all, 'customReports'] as const");
  });

  it('keeps unsafe custom-report mutation messages behind fallback copy', () => {
    expect(
      formatCustomReportMutationError(
        { message: 'postgres duplicate key violates constraint', statusCode: 500 },
        'Custom report creation is temporarily unavailable. Please refresh and try again.'
      )
    ).toBe('Custom report creation is temporarily unavailable. Please refresh and try again.');

    expect(
      formatCustomReportMutationError(
        { code: 'PERMISSION_DENIED' },
        'Custom report creation is temporarily unavailable. Please refresh and try again.'
      )
    ).toBe('You do not have permission to manage custom reports.');

    expect(
      formatCustomReportMutationError(
        new Error('Failed to execute custom report: database connection failed'),
        'Custom report execution is temporarily unavailable. Please refresh and try again.'
      )
    ).toBe('Custom report execution is temporarily unavailable. Please refresh and try again.');

    expect(
      formatCustomReportMutationError(
        new Error('TypeError: Cannot read properties of undefined (reading columns)'),
        'Custom report execution is temporarily unavailable. Please refresh and try again.'
      )
    ).toBe('Custom report execution is temporarily unavailable. Please refresh and try again.');
  });
});
