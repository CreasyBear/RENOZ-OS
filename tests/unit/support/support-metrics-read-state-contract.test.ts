import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('support metrics read-state contract', () => {
  it('keeps support metrics failures operator-safe and stale metrics honest', () => {
    const dashboard = read('src/routes/_authenticated/support/dashboard.tsx');
    const landing = read('src/routes/_authenticated/support/support-page.tsx');
    const alert = read('src/components/domain/support/support-metrics-read-state-alert.tsx');
    const hook = read('src/hooks/support/use-support-metrics.ts');
    const queryKeys = read('src/lib/query-keys.ts');

    expect(alert).toContain("state: 'unavailable' | 'stale'");
    expect(alert).toContain('Support metrics unavailable');
    expect(alert).toContain('Issue queues and support actions remain available.');
    expect(alert).toContain('Support metrics refresh unavailable');
    expect(alert).toContain('Showing the most recent support metrics while refresh is unavailable.');
    expect(alert).not.toContain('error.message');

    for (const route of [dashboard, landing]) {
      expect(route).toContain('SupportMetricsReadStateAlert');
      expect(route).toContain('const supportMetricsHardError = error && !metrics');
      expect(route).toContain('const supportMetricsWarning = error && metrics');
      expect(route).toContain('state="unavailable"');
      expect(route).toContain('state="stale"');
      expect(route).toContain('void refetch();');
      expect(route).not.toContain('error instanceof Error ? error.message');
      expect(route).not.toContain("'Unknown error'");
      expect(route).not.toContain('Failed to load metrics');
    }

    expect(dashboard).toContain('{!supportMetricsHardError ? (');
    expect(hook).toContain('normalizeReadQueryError');
    expect(hook).toContain('Support metrics are temporarily unavailable. Please refresh and try again.');
    expect(queryKeys).toContain('supportMetricsWithDates');
  });
});
