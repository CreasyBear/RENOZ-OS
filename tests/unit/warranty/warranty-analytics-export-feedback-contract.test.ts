import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('warranty analytics export feedback contract', () => {
  it('formats export mutation failures before display', () => {
    const page = read('src/components/domain/reports/warranty-analytics-page.tsx');
    const warrantyHooks = read('src/hooks/warranty/index.ts');
    const formatter = read('src/hooks/warranty/_mutation-errors.ts');
    const analyticsHook = read('src/hooks/warranty/analytics/use-warranty-analytics.ts');
    const server = read('src/server/functions/warranty/analytics/warranty-analytics.ts');
    const schema = read('src/lib/schemas/warranty/analytics.ts');

    expect(page).toContain('formatWarrantyMutationError');
    expect(page).toContain('WARRANTY_ANALYTICS_EXPORT_ERROR_MESSAGES');
    expect(page).toContain(
      "PERMISSION_DENIED: 'You do not have permission to export warranty analytics.'"
    );
    expect(page).toContain(
      "AUTH_ERROR: 'Your session has expired. Sign in again before exporting warranty analytics.'"
    );
    expect(page).toContain(
      "RATE_LIMIT: 'Too many warranty analytics exports were attempted. Wait a moment and retry.'"
    );
    expect(page).toContain('formatWarrantyAnalyticsExportError(error)');
    expect(page).toContain(
      'Warranty analytics export is temporarily unavailable. Please refresh and try again.'
    );
    expect(page).not.toContain("toast.error(error.message || 'Failed to export analytics data.')");
    expect(page).not.toContain('error.message ||');

    expect(warrantyHooks).toContain("export { formatWarrantyMutationError } from './_mutation-errors';");
    expect(formatter).toContain('formatWarrantyMutationError');
    expect(analyticsHook).toContain('useExportWarrantyAnalytics');
    expect(analyticsHook).toContain('exportWarrantyAnalytics({ data: input })');
    expect(server).toContain('export const exportWarrantyAnalytics');
    expect(server).toContain('exportWarrantyAnalyticsSchema');
    expect(server).toContain('getWarrantyAnalyticsSummary');
    expect(server).toContain('getExtensionVsResolution');
    expect(schema).toContain('exportWarrantyAnalyticsSchema');
    expect(schema).toContain("format: z.enum(['csv', 'json']).default('csv')");
  });
});
