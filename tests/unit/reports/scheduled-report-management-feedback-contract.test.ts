import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatScheduledReportMutationError } from '@/hooks/reports';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

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

  it('keeps the scheduled-report mutation spine and cache policy explicit', () => {
    const hook = read('src/hooks/reports/use-scheduled-reports.ts');
    const server = read('src/server/functions/reports/scheduled-reports.ts');
    const schema = read('src/lib/schemas/reports/scheduled-reports.ts');
    const queryKeys = read('src/lib/query-keys.ts');

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
    expect(queryKeys).toContain('scheduledReports: {');
    expect(queryKeys).toContain("all: () => [...queryKeys.reports.all, 'scheduledReports'] as const");
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
  });
});
