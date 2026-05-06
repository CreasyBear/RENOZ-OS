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

describe('pipeline activity mutation cache contract', () => {
  it('keeps activity mutation invalidation centralized without dropping affected caches', () => {
    const source = read('src/hooks/pipeline/use-activity-mutations.ts');

    expect(source).toContain('function invalidateOpportunityActivityCaches');
    expect(count(source, 'invalidateOpportunityActivityCaches(queryClient, opportunityId)')).toBe(4);
    expect(count(source, 'queryKeys.pipeline.activities(opportunityId)')).toBe(1);
    expect(count(source, 'queryKeys.pipeline.followUps(opportunityId)')).toBe(1);
    expect(count(source, 'queryKeys.pipeline.opportunity(opportunityId)')).toBe(1);
    expect(count(source, 'queryKeys.pipeline.activityTimeline(opportunityId, { days: 90 })')).toBe(1);
    expect(count(source, 'queryKeys.unifiedActivities.entityAuditWithRelated(')).toBe(1);
  });
});
