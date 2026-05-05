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
});
