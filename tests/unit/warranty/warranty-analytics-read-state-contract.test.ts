import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('warranty analytics read-state contract', () => {
  it('keeps cached analytics visible when panel refreshes fail', () => {
    const charts = read('src/components/domain/support/warranty-analytics-charts.tsx');
    const view = read('src/components/domain/reports/warranty-analytics-view.tsx');
    const hook = read('src/hooks/warranty/analytics/use-warranty-analytics.ts');
    const queryKeys = read('src/lib/query-keys.ts');
    const server = read('src/server/functions/warranty/analytics/warranty-analytics.ts');
    const schemas = read('src/lib/schemas/warranty/analytics.ts');

    expect(charts).toContain('AnalyticsStaleWarning');
    expect(charts).toContain('Analytics refresh unavailable');
    expect(charts.match(/if \(isError && !data\)/g)).toHaveLength(9);
    expect(charts).not.toContain('if (isError) {');
    expect(charts).toContain('Unable to load warranty summary');
    expect(charts).toContain(
      'Warranty analytics summary is temporarily unavailable. Please refresh and try again.'
    );
    expect(charts).toContain(
      'Showing the most recent warranty summary while refresh is unavailable.'
    );
    expect(charts).toContain(
      'Showing the most recent claims by product while refresh is unavailable.'
    );
    expect(charts).toContain(
      'Showing the most recent claims by type while refresh is unavailable.'
    );
    expect(charts).toContain(
      'Showing the most recent claims trend while refresh is unavailable.'
    );
    expect(charts).toContain(
      'Showing the most recent SLA compliance metrics while refresh is unavailable.'
    );
    expect(charts).toContain(
      'Showing the most recent cycle-count analysis while refresh is unavailable.'
    );
    expect(charts).toContain(
      'Showing the most recent warranty finance analytics while refresh is unavailable.'
    );
    expect(charts).toContain(
      'Showing the most recent extension type analytics while refresh is unavailable.'
    );
    expect(charts).toContain(
      'Showing the most recent resolution type analytics while refresh is unavailable.'
    );

    expect(view).toContain('data={dashboard.summary}');
    expect(view).toContain('isError={dashboard.queries.summary.isError}');
    expect(view).toContain('onRetry={() => dashboard.queries.summary.refetch()}');

    expect(hook).toContain('useWarrantyAnalyticsDashboard');
    expect(hook).toContain('normalizeReadQueryError');
    expect(hook).toContain("contractType: 'always-shaped'");
    expect(queryKeys).toContain('warrantyAnalytics');
    expect(queryKeys).toContain('claimsByProduct');
    expect(queryKeys).toContain('extensionVsResolution');
    expect(server).toContain('export const getWarrantyAnalyticsSummary');
    expect(server).toContain('export const getExtensionVsResolution');
    expect(server).toContain('eq(warranties.organizationId, ctx.organizationId)');
    expect(server).toContain('eq(warrantyClaims.organizationId, ctx.organizationId)');
    expect(schemas).toContain('warrantyAnalyticsFilterSchema');
    expect(schemas).toContain('getExtensionVsResolutionSchema');
  });
});
