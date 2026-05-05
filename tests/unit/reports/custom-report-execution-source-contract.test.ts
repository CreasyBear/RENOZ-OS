import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('custom report execution source contract', () => {
  it('fails closed for missing or unsupported custom-report definition sources', () => {
    const server = read('src/server/functions/reports/custom-reports.ts');

    expect(server).toContain("const SUPPORTED_CUSTOM_REPORT_SOURCES = ['procurement'] as const;");
    expect(server).toContain('function resolveCustomReportSource');
    expect(server).toContain("typeof source !== 'string' || source.trim().length === 0");
    expect(server).toContain(
      "throw new ValidationError('Report source is missing from this custom report definition.'"
    );
    expect(server).toContain(
      "throw new ValidationError('This custom report source is no longer supported.'"
    );
    expect(server).toContain('return assertUnsupportedCustomReportSource(source);');
    expect(server).not.toContain('Unknown source - return empty result');
    expect(server).not.toContain(`return {
        columns: definition.columns ?? [],
        rows: [],
        totalCount: 0,
        generatedAt: new Date(),
      };`);
  });

  it('keeps execution tenant scope, auth, and known-error propagation explicit', () => {
    const server = read('src/server/functions/reports/custom-reports.ts');

    expect(server).toContain('export const executeCustomReport');
    expect(server).toContain('executeCustomReportSchema');
    expect(server).toContain('withAuth({ permission: PERMISSIONS.report.viewOperations })');
    expect(server).toContain('eq(customReports.organizationId, ctx.organizationId)');
    expect(server).toContain('if (error instanceof NotFoundError || error instanceof ValidationError)');
    expect(server).toContain('throw error;');
  });

  it('keeps unexpected execution failures logged and operator-safe', () => {
    const server = read('src/server/functions/reports/custom-reports.ts');

    expect(server).toContain("import { logger } from '@/lib/logger';");
    expect(server).toContain('NotFoundError, ServerError, ValidationError');
    expect(server).toContain("logger.error('[reports.customReports] Failed to execute custom report'");
    expect(server).toContain('orgId: ctx.organizationId');
    expect(server).toContain('reportId: data.id');
    expect(server).toContain('throw new ServerError(');
    expect(server).toContain(
      "'Custom report execution is temporarily unavailable. Please refresh and try again.'"
    );
    expect(server).toContain("'CUSTOM_REPORT_EXECUTION_FAILED'");
    expect(server).not.toContain('Failed to execute custom report: ${');
    expect(server).not.toContain('error instanceof Error ? error.message');
  });
});
