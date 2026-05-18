import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatReportScheduleError, formatScheduledReportMutationError } from '@/hooks/reports';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

const reportSchedulePages = [
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
    path: 'src/components/domain/reports/financial-summary-page.tsx',
    reportName: 'financial summary report',
  },
  {
    path: 'src/components/domain/reports/job-costing-report-page.tsx',
    reportName: 'job costing report',
  },
  {
    path: 'src/components/domain/reports/warranty-analytics-page.tsx',
    reportName: 'warranty analytics report',
  },
] as const;

describe('scheduled report management feedback contract', () => {
  it('formats settings scheduled-report mutation failures before display', () => {
    const container = read('src/components/domain/settings/scheduled-reports-list-container.tsx');
    const form = read('src/components/domain/settings/scheduled-report-form.tsx');
    const reportsHooks = read('src/hooks/reports/index.ts');
    const reportsFormatter = read('src/hooks/reports/_mutation-errors.ts');

    expect(reportsHooks).toContain(
      "export { formatScheduledReportMutationError } from './_mutation-errors';"
    );
    expect(reportsFormatter).toContain('formatScheduledReportMutationError');
    expect(reportsFormatter).toContain('SCHEDULED_REPORT_CODE_MESSAGES');
    expect(reportsFormatter).toContain('You do not have permission to manage scheduled reports.');

    expect(container).toContain('formatScheduledReportMutationError');
    expect(container).toContain('SCHEDULED_REPORT_ERROR_FALLBACKS');
    expect(container).toContain('submitError={submitError}');
    expect(container).toContain('catch (error)');
    expect(container).toContain('formatScheduledReportMutationError(error, SCHEDULED_REPORT_ERROR_FALLBACKS.delete)');
    expect(container).toContain('formatScheduledReportMutationError(error, SCHEDULED_REPORT_ERROR_FALLBACKS.execute)');
    expect(container).toContain('formatScheduledReportMutationError(error, SCHEDULED_REPORT_ERROR_FALLBACKS.bulkDelete)');
    expect(container).toContain('formatScheduledReportMutationError(error, SCHEDULED_REPORT_ERROR_FALLBACKS.bulkUpdate)');
    expect(container).not.toContain("toast.error('Failed to delete report')");
    expect(container).not.toContain("toast.error('Failed to execute report')");
    expect(container).not.toContain("toast.error('Failed to update report status')");
    expect(container).not.toContain("toast.error('Failed to delete reports')");
    expect(container).not.toContain("toast.error('Failed to update reports')");
    expect(container).not.toContain('?.message ?? null');

    expect(form).toContain('submitError?: string | null');
    expect(form).toContain('<FormErrorSummary form={form} submitError={submitError} />');
  });

  it('formats report-page schedule failures before display', () => {
    const reportsHooks = read('src/hooks/reports/index.ts');
    const reportsFormatter = read('src/hooks/reports/_mutation-errors.ts');

    expect(reportsHooks).toContain("export { formatReportScheduleError } from './_mutation-errors';");
    expect(reportsFormatter).toContain('formatReportScheduleError');
    expect(reportsFormatter).toContain(
      '`${reportLabel} scheduling is temporarily unavailable. Please refresh and try again.`'
    );

    for (const { path, reportName } of reportSchedulePages) {
      const source = read(path);

      expect(source).toContain('formatReportScheduleError');
      expect(source).toContain(reportName);
      expect(source).toContain('toast.error(formatReportScheduleError(error,');
      expect(source).toContain('throw error');
      expect(source).not.toContain("toast.error('Failed to schedule report')");
    }
  });

  it('keeps the scheduled-report mutation spine and cache policy explicit', () => {
    const hook = read('src/hooks/reports/use-scheduled-reports.ts');
    const server = read('src/server/functions/reports/scheduled-reports.ts');
    const schema = read('src/lib/schemas/reports/scheduled-reports.ts');
    const reportsCatalog = read('src/lib/query-key-catalog/reports.ts');

    expect(hook).toContain('useCreateScheduledReport');
    expect(hook).toContain('useUpdateScheduledReport');
    expect(hook).toContain('useDeleteScheduledReport');
    expect(hook).toContain('useExecuteScheduledReport');
    expect(hook).toContain('useBulkUpdateScheduledReports');
    expect(hook).toContain('useBulkDeleteScheduledReports');
    expect(hook).toContain('queryKeys.reports.scheduledReports.lists()');
    expect(hook).toContain('queryKeys.reports.scheduledReports.detail');
    expect(hook).toContain('queryKeys.reports.scheduledReports.status');

    expect(server).toContain('export const createScheduledReport');
    expect(server).toContain('export const updateScheduledReport');
    expect(server).toContain('export const deleteScheduledReport');
    expect(server).toContain('export const executeScheduledReport');
    expect(server).toContain('export const bulkUpdateScheduledReports');
    expect(server).toContain('export const bulkDeleteScheduledReports');
    expect(server).toContain('withAuth({ permission: PERMISSIONS.scheduledReport.create })');
    expect(server).toContain('withAuth({ permission: PERMISSIONS.scheduledReport.update })');
    expect(server).toContain('withAuth({ permission: PERMISSIONS.scheduledReport.delete })');
    expect(server).toContain('eq(scheduledReports.organizationId, ctx.organizationId)');

    expect(schema).toContain('createScheduledReportSchema');
    expect(schema).toContain('updateScheduledReportSchema');
    expect(schema).toContain('deleteScheduledReportSchema');
    expect(schema).toContain('executeScheduledReportSchema');
    expect(schema).toContain('bulkUpdateScheduledReportsSchema');
    expect(schema).toContain('bulkDeleteScheduledReportsSchema');
    expect(reportsCatalog).toContain('const scheduledReports = {');
    expect(reportsCatalog).toContain("const scheduledReportsAll = () => [...all, 'scheduledReports'] as const");
  });

  it('keeps unsafe scheduled-report mutation messages behind fallback copy', () => {
    expect(
      formatScheduledReportMutationError(
        { message: 'postgres duplicate key violates constraint', statusCode: 500 },
        'Scheduled report updates are temporarily unavailable. Please refresh and try again.'
      )
    ).toBe('Scheduled report updates are temporarily unavailable. Please refresh and try again.');

    expect(
      formatScheduledReportMutationError(
        { code: 'PERMISSION_DENIED' },
        'Scheduled report updates are temporarily unavailable. Please refresh and try again.'
      )
    ).toBe('You do not have permission to manage scheduled reports.');

    expect(
      formatReportScheduleError(
        { message: 'postgres duplicate key violates constraint', statusCode: 500 },
        'pipeline forecast report'
      )
    ).toBe('pipeline forecast report scheduling is temporarily unavailable. Please refresh and try again.');

    expect(
      formatScheduledReportMutationError(
        new Error('Cannot read properties of undefined (reading scheduleId)'),
        'Scheduled report updates are temporarily unavailable. Please refresh and try again.'
      )
    ).toBe('Scheduled report updates are temporarily unavailable. Please refresh and try again.');
  });
});
