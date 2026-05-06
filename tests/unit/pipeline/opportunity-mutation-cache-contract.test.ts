import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function count(source: string, pattern: string): number {
  return source.split(pattern).length - 1;
}

describe('pipeline opportunity mutation cache contract', () => {
  it('keeps opportunity list and metrics invalidation centralized', () => {
    const source = read('src/hooks/pipeline/use-opportunity-mutations.ts');
    const index = read('src/hooks/pipeline/index.ts');
    const listContainer = read(
      'src/components/domain/pipeline/opportunities/opportunities-list-container.tsx'
    );

    expect(source).toContain('function invalidateOpportunityListQueries(queryClient: QueryClient)');
    expect(source).toContain('function invalidatePipelineMetrics(queryClient: QueryClient)');
    expect(count(source, 'invalidateOpportunityListQueries(queryClient)')).toBe(7);
    expect(count(source, 'invalidatePipelineMetrics(queryClient)')).toBe(7);
    expect(count(source, 'queryKeys.opportunities.lists()')).toBe(4);
    expect(count(source, 'queryKeys.opportunities.infiniteLists()')).toBe(2);
    expect(count(source, 'queryKeys.pipeline.metrics()')).toBe(1);
    expect(source).toContain('convertToOrder({ data: { id: opportunityId } })');
    expect(source).toContain('queryKeys.orders.detail(result.order.id)');
    expect(source).toContain('queryKeys.orders.withCustomer(result.order.id)');
    expect(source).not.toContain('options?:');
    expect(source).not.toContain('...options');
    expect(source).toContain('export function useBulkDeleteOpportunities()');
    expect(source).toContain('Promise.allSettled');
    expect(source).toContain('deleteOpportunity({ data: { id } })');
    expect(source).toContain(
      'queryClient.removeQueries({ queryKey: queryKeys.pipeline.opportunity(id) })'
    );
    expect(index).toContain('useBulkDeleteOpportunities');
    expect(index).toContain('type BulkDeleteOpportunitiesResult');
    expect(listContainer).toContain('const bulkDeleteMutation = useBulkDeleteOpportunities();');
    expect(listContainer).toContain('result.deleted.length');
    expect(listContainer).toContain('result.failed.length');
    expect(listContainer).not.toContain(
      'Promise.all(selectedItems.map((item) => deleteMutation.mutateAsync(item.id)))'
    );
  });
});
