import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('business overview cache contract', () => {
  it('refreshes mounted dashboard queries without cross-domain root invalidation', () => {
    const container = read(
      'src/components/domain/dashboard/business-overview/business-overview-container.tsx'
    );

    expect(container).toContain('financialQuery.refetch()');
    expect(container).toContain('pipelineQuery.refetch()');
    expect(container).toContain('customerKpisQuery.refetch()');
    expect(container).toContain('ordersQuery.refetch()');
    expect(container).toContain('projectsQuery.refetch()');
    expect(container).toContain('inventoryQuery.refetch()');
    expect(container).toContain('recentOrdersToShipQuery.refetch()');
    expect(container).toContain('recentOpportunitiesQuery.refetch()');
    expect(container).toContain('recentOutstandingQuery.refetch()');
    expect(container).toContain('healthDistQuery.isRefetching');

    expect(container).not.toContain('useQueryClient');
    expect(container).not.toContain('invalidateQueries');
    expect(container).not.toContain('queryKeys.financial.all');
    expect(container).not.toContain('queryKeys.pipeline.all');
    expect(container).not.toContain('queryKeys.customerAnalytics.all');
  });
});
