import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('dashboard diagnostic logging contract', () => {
  it('does not emit raw dashboard read payloads or query-state snapshots from UI hooks', () => {
    const metricsHook = read('src/hooks/dashboard/use-dashboard-metrics.ts');
    const overviewContainer = read(
      'src/components/domain/dashboard/overview/overview-container.tsx'
    );
    const businessOverviewContainer = read(
      'src/components/domain/dashboard/business-overview/business-overview-container.tsx'
    );

    expect(metricsHook).not.toContain('console.debug');
    expect(metricsHook).not.toContain('raw-result');
    expect(overviewContainer).not.toContain('console.debug');
    expect(overviewContainer).not.toContain('query-state-json');
    expect(businessOverviewContainer).not.toContain('logger.error');
    expect(businessOverviewContainer).not.toContain('Query errors');
    expect(businessOverviewContainer).not.toContain('error.message');
  });
});
